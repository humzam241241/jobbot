import Anthropic from '@anthropic-ai/sdk';
import { GenInput, GenResult, Provider, AIProviderError } from './types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('anthropic-provider');

export class AnthropicProvider implements Provider {
  name = 'anthropic' as const;
  client: Anthropic | null = null;
  baseUrl: string;
  defaultModel: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';
    this.defaultModel = 'claude-3-5-sonnet-20240620'; // Default to Claude 3.5 Sonnet

    if (apiKey) {
      try {
        this.client = new Anthropic({
          apiKey,
          baseURL: this.baseUrl,
        });
        logger.info('Anthropic provider initialized');
      } catch (error) {
        logger.error('Failed to initialize Anthropic client', { error });
        this.client = null;
      }
    } else {
      logger.warn('Anthropic API key not provided');
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
        message: 'Anthropic provider is not available',
      });
    }

    const model = input.model || this.defaultModel;
    const temperature = input.temperature || 0.2;
    const timeoutMs = input.timeoutMs || 60000; // Default 60s timeout
    
    try {
      logger.info(`Generating with Anthropic model ${model}`, { temperature });
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await this.client!.messages.create({
        model,
        max_tokens: 4000,
        temperature,
        system: 'You are a helpful assistant that responds with JSON. Follow the schema provided.',
        messages: [
          {
            role: 'user',
            content: `${input.prompt}\n\nRespond with valid JSON that matches this schema: ${input.schema.description || JSON.stringify(input.schema._def)}`,
          }
        ],
        response_format: { type: 'json_object' },
      }, { signal: controller.signal as any });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Parse JSON response
      const content = response.content[0]?.text || '{}';
      let jsonResult;
      
      try {
        jsonResult = JSON.parse(content);
      } catch (parseError) {
        logger.error('Failed to parse JSON response', { error: parseError, content });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Failed to parse JSON response from Anthropic',
          details: { content },
        });
      }
      
      // Validate against schema
      try {
        const validatedJson = input.schema.parse(jsonResult);
        
        return {
          json: validatedJson,
          raw: response,
          tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
        };
      } catch (validationError) {
        logger.error('Schema validation failed for Anthropic response', { error: validationError, json: jsonResult });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Anthropic response did not match expected schema',
          details: { validationError, json: jsonResult },
        });
      }
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        logger.error('Anthropic request timed out', { timeoutMs });
        throw new AIProviderError({
          code: 'TIMEOUT',
          message: `Anthropic request timed out after ${timeoutMs}ms`,
        });
      }
      
      // Handle rate limiting
      if (error.status === 429) {
        logger.error('Anthropic rate limit exceeded', { error });
        throw new AIProviderError({
          code: 'RATE_LIMIT',
          message: 'Anthropic rate limit exceeded',
          details: error,
        });
      }
      
      // Handle authentication errors
      if (error.status === 401) {
        logger.error('Anthropic authentication failed', { error });
        throw new AIProviderError({
          code: 'AUTH',
          message: 'Anthropic authentication failed',
          details: error,
        });
      }
      
      // Handle server errors
      if (error.status && error.status >= 500) {
        logger.error('Anthropic server error', { error });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Anthropic server error',
          details: error,
        });
      }
      
      // Handle other errors
      logger.error('Unknown Anthropic error', { error });
      throw new AIProviderError({
        code: 'UNKNOWN',
        message: error.message || 'Unknown Anthropic error',
        details: error,
      });
    }
  }
}
