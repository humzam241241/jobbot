import { ZodSchema } from 'zod';
import { createLogger } from '@/lib/logger';
import JSON5 from 'json5';

const logger = createLogger('ai-provider');

// Define the providers we can try
type Provider = 'google' | 'openai' | 'anthropic';

interface CallModelOptions {
  prompt: string;
  schema: ZodSchema<any>;
  provider?: Provider;
  model?: string;
  maxRetries?: number;
}

/**
 * Calls an LLM model with the given prompt and validates the response against a schema
 * Will retry with different providers if the first attempt fails
 */
export async function callModel<T>({
  prompt,
  schema,
  provider = 'google',
  model,
  maxRetries = 2
}: CallModelOptions): Promise<T> {
  // Order of providers to try
  const providerOrder: Provider[] = ['google', 'openai', 'anthropic'];
  
  // Start with the specified provider, then try others
  const providers = [
    provider,
    ...providerOrder.filter(p => p !== provider)
  ];
  
  let lastError: Error | null = null;
  
  // Try each provider
  for (const currentProvider of providers) {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        logger.info(`Calling ${currentProvider} model`, { 
          provider: currentProvider, 
          model: model || 'default',
          retry: retries 
        });
        
        // Call the appropriate provider
        const response = await callProviderModel(currentProvider, prompt, model);
        
        // Try to extract JSON from the response
        const extracted = extractJSON(response);
        if (!extracted) {
          throw new Error('Failed to extract JSON from response');
        }
        
        // Parse and validate with the schema
        const parsed = schema.parse(extracted);
        
        logger.info(`Successfully parsed response from ${currentProvider}`);
        return parsed as T;
      } catch (error: any) {
        lastError = error;
        logger.warn(`Error with ${currentProvider} (retry ${retries}): ${error.message}`);
        retries++;
      }
    }
  }
  
  // If we get here, all providers failed
  throw lastError || new Error('All providers failed to generate valid response');
}

/**
 * Calls the appropriate provider's model
 */
async function callProviderModel(
  provider: Provider,
  prompt: string,
  model?: string
): Promise<string> {
  // Import the LLM module
  const { llm } = await import('@/lib/providers/llm');
  
  // System prompt to encourage JSON output
  const systemPrompt = `You are a resume tailoring assistant that always responds with valid JSON. 
Your task is to analyze a resume and job description, then output a structured JSON object 
according to the required schema. Never include explanations, markdown formatting, or code blocks.
Just return the raw JSON object.`;
  
  // Call the LLM
  return llm.complete({
    system: systemPrompt,
    user: prompt,
    model: model || 'auto'
  });
}

/**
 * Extracts JSON from a string that might contain other text
 */
function extractJSON(text: string): any | null {
  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Not valid JSON, try to extract from text
  }
  
  // Try JSON5 parse (more lenient)
  try {
    return JSON5.parse(text);
  } catch (e) {
    // Not valid JSON5, try to extract from text
  }
  
  // Try to find JSON in code blocks
  const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      try {
        return JSON5.parse(jsonMatch[1]);
      } catch (e2) {
        // Not valid JSON in code block
      }
    }
  }
  
  // Try to find anything that looks like a JSON object
  const objectMatch = text.match(/{[\s\S]*?}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (e) {
      try {
        return JSON5.parse(objectMatch[0]);
      } catch (e2) {
        // Not valid JSON object
      }
    }
  }
  
  return null;
}
