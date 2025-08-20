import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { AIProviderError, GenInput, Provider } from './providers/types';
import { createLogger } from '../logger';
import { ResumeKitSchema } from '../zod';

// Create providers
const openaiProvider = new OpenAIProvider();
const anthropicProvider = new AnthropicProvider();
const googleProvider = new GoogleProvider();

// Get provider order from environment
const defaultProviderOrder = ['google', 'openai', 'anthropic'];
const envProviderOrder = process.env.LLM_PROVIDER_ORDER
  ? process.env.LLM_PROVIDER_ORDER.split(',').map(p => p.trim().toLowerCase())
  : defaultProviderOrder;

// Validate provider order
const validProviderOrder = envProviderOrder.filter(p => 
  p === 'google' || p === 'openai' || p === 'anthropic' || p === 'auto'
);

/**
 * Check if any provider is available
 */
export function hasAnyProvider(): boolean {
  return openaiProvider.available() || 
         anthropicProvider.available() || 
         googleProvider.available();
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): Provider[] {
  const providers: Provider[] = [];
  
  if (openaiProvider.available()) providers.push(openaiProvider);
  if (anthropicProvider.available()) providers.push(anthropicProvider);
  if (googleProvider.available()) providers.push(googleProvider);
  
  return providers;
}

/**
 * Get provider by name
 */
export function getProvider(name: string): Provider | null {
  switch (name.toLowerCase()) {
    case 'openai':
      return openaiProvider.available() ? openaiProvider : null;
    case 'anthropic':
      return anthropicProvider.available() ? anthropicProvider : null;
    case 'google':
      return googleProvider.available() ? googleProvider : null;
    default:
      return null;
  }
}

/**
 * Generate content using a specific provider or fallback to available providers
 */
export async function generateWithProvider(
  providerName: string | undefined,
  input: GenInput
): Promise<{ result: any; provider: string }> {
  const logger = createLogger('ai-orchestrator');
  
  // If specific provider requested, try only that one
  if (providerName && providerName !== 'auto') {
    const provider = getProvider(providerName);
    if (!provider) {
      throw new AIProviderError({
        code: 'PROVIDER_UNAVAILABLE',
        message: `Requested provider "${providerName}" is not available`,
      });
    }
    
    try {
      const result = await provider.generate(input);
      return { result: result.json, provider: provider.name };
    } catch (error) {
      logger.error(`Error using ${providerName} provider`, { error });
      throw error;
    }
  }
  
  // Try providers in order
  const providers = getAvailableProviders();
  
  // Sort providers based on preferred order
  const sortedProviders = [...providers].sort((a, b) => {
    const aIndex = validProviderOrder.indexOf(a.name);
    const bIndex = validProviderOrder.indexOf(b.name);
    return aIndex - bIndex;
  });
  
  if (sortedProviders.length === 0) {
    throw new AIProviderError({
      code: 'PROVIDER_UNAVAILABLE',
      message: 'No AI providers are available',
    });
  }
  
  // Try each provider in order
  const errors: any[] = [];
  
  for (const provider of sortedProviders) {
    try {
      logger.info(`Trying provider: ${provider.name}`);
      const result = await provider.generate(input);
      return { result: result.json, provider: provider.name };
    } catch (error: any) {
      logger.warn(`Provider ${provider.name} failed`, { error });
      errors.push({ provider: provider.name, error });
      
      // Only retry on rate limit or server errors
      if (error instanceof AIProviderError && 
          error.code !== 'RATE_LIMIT' && 
          error.code !== 'SERVER') {
        throw error;
      }
    }
  }
  
  // If we get here, all providers failed
  throw new AIProviderError({
    code: 'PROVIDER_UNAVAILABLE',
    message: 'All available providers failed',
    details: { errors },
  });
}

/**
 * Generate a resume kit based on job description and resume
 */
export async function generateResumeKit(input: {
  userId: string;
  jobDescription: string;
  resumeText?: string;
  providerPreference?: string;
  telemetryId?: string;
}): Promise<{
  ok: true;
  partial: boolean;
  artifacts: { 
    coverLetterMd: string; 
    resumeMd: string; 
    pdfs: { name: string; url: string }[] 
  };
  usedProvider: string;
} | {
  ok: false;
  code: string;
  message: string;
  details?: any;
}> {
  const telemetryId = input.telemetryId || uuidv4();
  const logger = createLogger('resume-kit', telemetryId);
  
  try {
    logger.info('Starting resume kit generation', { 
      userId: input.userId,
      providerPreference: input.providerPreference,
    });
    
    // Validate inputs
    if (!input.jobDescription) {
      return logger.apiError(
        'VALIDATION',
        'Job description is required',
        { field: 'jobDescription' }
      );
    }
    
    // Create prompt for resume generation
    const prompt = `
      You are an expert resume writer that creates ATS-optimized resumes tailored to job descriptions.
      
      ${input.resumeText ? `ORIGINAL RESUME:\n${input.resumeText}\n\n` : ''}
      
      JOB DESCRIPTION:
      ${input.jobDescription}
      
      Create a tailored resume and cover letter based on the job description${input.resumeText ? ' and original resume' : ''}.
      
      Your response should be a JSON object with the following fields:
      - summary: A professional summary paragraph
      - highlights: An array of key achievements/qualifications relevant to this job
      - experienceBullets: An array of experience bullet points tailored to this job
      - skills: An array of relevant skills for this position
      - coverLetter: A full cover letter for this position
      
      Make sure all content is tailored specifically to this job description and highlights relevant experience and skills.
    `;
    
    // Generate content
    const { result, provider } = await generateWithProvider(
      input.providerPreference,
      {
        prompt,
        schema: ResumeKitSchema,
        timeoutMs: 60000,
      }
    );
    
    // Format resume markdown
    const resumeMd = `
# Professional Resume

## Summary
${result.summary}

## Highlights
${result.highlights.map(h => `- ${h}`).join('\n')}

## Experience
${result.experienceBullets.map(b => `- ${b}`).join('\n')}

## Skills
${result.skills.map(s => `- ${s}`).join('\n')}
    `.trim();
    
    // Format cover letter markdown
    const coverLetterMd = result.coverLetter;
    
    // For now, return without PDFs (will be implemented in the next task)
    return {
      ok: true,
      partial: true, // PDFs not yet implemented
      artifacts: {
        resumeMd,
        coverLetterMd,
        pdfs: [], // Will be populated in the next task
      },
      usedProvider: provider,
    };
  } catch (error: any) {
    // Handle AI provider errors
    if (error instanceof AIProviderError) {
      return logger.apiError(
        error.code,
        error.message,
        error.details
      );
    }
    
    // Handle other errors
    return logger.apiError(
      'UNKNOWN',
      'An unexpected error occurred',
      { error: error.message }
    );
  }
}
