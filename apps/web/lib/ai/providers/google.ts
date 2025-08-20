import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenInput, GenResult, Provider, AIProviderError } from './types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('google-provider');

export class GoogleProvider implements Provider {
  name = 'google' as const;
  client: GoogleGenerativeAI | null = null;
  baseUrl: string;
  defaultModel: string;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    this.baseUrl = process.env.GOOGLE_GENAI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    this.defaultModel = 'gemini-1.5-pro'; // Default to Gemini 1.5 Pro

    if (apiKey) {
      try {
        this.client = new GoogleGenerativeAI(apiKey, {
          apiEndpoint: this.baseUrl,
        });
        logger.info('Google provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Google client', { error });
        this.client = null;
      }
    } else {
      logger.warn('Google API key not provided');
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
        message: 'Google provider is not available',
      });
    }

    const model = input.model || this.defaultModel;
    const temperature = input.temperature || 0.2;
    const timeoutMs = input.timeoutMs || 60000; // Default 60s timeout
    
    try {
      logger.info(`Generating with Google model ${model}`, { temperature });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const geminiModel = this.client!.getGenerativeModel({ model });
      
      const response = await geminiModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${input.prompt}\n\nRespond with valid JSON that matches this schema: ${input.schema.description || JSON.stringify(input.schema._def)}`,
              }
            ]
          }
        ],
        generationConfig: {
          temperature,
          responseFormat: { type: 'json_object' },
        },
      }, { signal: controller.signal as any });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Parse JSON response
      const content = response.response.text() || '{}';
      let jsonResult;
      
      try {
        jsonResult = JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse JSON response', { error: parseError, content });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Failed to parse JSON response from Google',
          details: { content },
        });
      }
      
      // Validate against schema
      try {
        const validatedJson = input.schema.parse(jsonResult);
        
        return {
          json: validatedJson,
          raw: response,
          tokensUsed: response.response.usageMetadata?.totalTokens,
        };
      } catch (validationError) {
        logger.error('Schema validation failed for Google response', { error: validationError, json: jsonResult });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Google response did not match expected schema',
          details: { validationError, json: jsonResult },
        });
      }
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        logger.error('Google request timed out', { timeoutMs });
        throw new AIProviderError({
          code: 'TIMEOUT',
          message: `Google request timed out after ${timeoutMs}ms`,
        });
      }
      
      // Handle rate limiting
      if (error.status === 429 || (error.message && error.message.includes('quota'))) {
        logger.error('Google rate limit or quota exceeded', { error });
        throw new AIProviderError({
          code: 'RATE_LIMIT',
          message: 'Google rate limit or quota exceeded',
          details: error,
        });
      }
      
      // Handle authentication errors
      if (error.status === 401 || (error.message && error.message.includes('auth'))) {
        logger.error('Google authentication failed', { error });
        throw new AIProviderError({
          code: 'AUTH',
          message: 'Google authentication failed',
          details: error,
        });
      }
      
      // Handle server errors
      if (error.status && error.status >= 500) {
        logger.error('Google server error', { error });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Google server error',
          details: error,
        });
      }
      
      // Handle other errors
      logger.error('Unknown Google error', { error });
      throw new AIProviderError({
        code: 'UNKNOWN',
        message: error.message || 'Unknown Google error',
        details: error,
      });
    }
  }
}
