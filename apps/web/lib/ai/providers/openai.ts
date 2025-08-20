import OpenAI from 'openai';
import { GenInput, GenResult, Provider, AIProviderError } from './types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('openai-provider');

export class OpenAIProvider implements Provider {
  name = 'openai' as const;
  client: OpenAI | null = null;
  baseUrl: string;
  defaultModel: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.defaultModel = 'gpt-4o'; // Default to GPT-4o

    if (apiKey) {
      try {
        this.client = new OpenAI({
          apiKey,
          baseURL: this.baseUrl,
        });
        logger.info('OpenAI provider initialized');
      } catch (error) {
        logger.error('Failed to initialize OpenAI client', { error });
        this.client = null;
      }
    } else {
      logger.warn('OpenAI API key not provided');
      this.client = null;
    }
  }

  available(): boolean {
    return this.client !== null;
  }

  async generate(input: GenInput): Promise<GenResult> {
    if (!this.available()) {
      throw new AIProviderError({
        code: 'PROVIDER_UNAVAILABLE',
        message: 'OpenAI provider is not available',
      });
    }

    const model = input.model || this.defaultModel;
    const temperature = input.temperature || 0.2;
    const timeoutMs = input.timeoutMs || 60000; // Default 60s timeout
    
    try {
      logger.info(`Generating with OpenAI model ${model}`, { temperature });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await this.client!.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that responds with JSON. Follow the schema provided.',
          },
          {
            role: 'user',
            content: `${input.prompt}\n\nRespond with valid JSON that matches this schema: ${input.schema.description || JSON.stringify(input.schema._def)}`,
          },
        ],
        temperature,
        response_format: { type: 'json_object' },
      }, { signal: controller.signal as any });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Parse JSON response
      const content = response.choices[0]?.message?.content || '{}';
      let jsonResult;
      
      try {
        jsonResult = JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse JSON response', { error: parseError, content });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Failed to parse JSON response from OpenAI',
          details: { content },
        });
      }
      
      // Validate against schema
      try {
        const validatedJson = input.schema.parse(jsonResult);
        
        return {
          json: validatedJson,
          raw: response,
          tokensUsed: response.usage?.total_tokens,
        };
      } catch (validationError) {
        logger.error('Schema validation failed for OpenAI response', { error: validationError, json: jsonResult });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'OpenAI response did not match expected schema',
          details: { validationError, json: jsonResult },
        });
      }
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        logger.error('OpenAI request timed out', { timeoutMs });
        throw new AIProviderError({
          code: 'TIMEOUT',
          message: `OpenAI request timed out after ${timeoutMs}ms`,
        });
      }
      
      // Handle rate limiting
      if (error.status === 429) {
        logger.error('OpenAI rate limit exceeded', { error });
        throw new AIProviderError({
          code: 'RATE_LIMIT',
          message: 'OpenAI rate limit exceeded',
          details: error,
        });
      }
      
      // Handle authentication errors
      if (error.status === 401) {
        logger.error('OpenAI authentication failed', { error });
        throw new AIProviderError({
          code: 'AUTH',
          message: 'OpenAI authentication failed',
          details: error,
        });
      }
      
      // Handle server errors
      if (error.status && error.status >= 500) {
        logger.error('OpenAI server error', { error });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'OpenAI server error',
          details: error,
        });
      }
      
      // Handle other errors
      logger.error('Unknown OpenAI error', { error });
      throw new AIProviderError({
        code: 'UNKNOWN',
        message: error.message || 'Unknown OpenAI error',
        details: error,
      });
    }
  }
}
