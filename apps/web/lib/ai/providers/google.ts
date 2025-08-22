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
    this.defaultModel = 'gemini-2.5-pro';

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
    const timeoutMs = input.timeoutMs || 60000;
    
    try {
      logger.info(`Generating with Google model ${model}`, { temperature });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const geminiModel = this.client!.getGenerativeModel({ model });
      
      let response;
      try {
        // Try with responseSchema (Gemini 2.5+ feature)
        if (model.includes('gemini-2.5')) {
          response = await geminiModel.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${input.prompt}\n\nRespond with valid JSON that matches the provided schema.`,
                  }
                ]
              }
            ],
            generationConfig: {
              temperature,
              responseSchema: typeof input.schema._def === 'object' ? input.schema._def : undefined,
            },
          }, { signal: controller.signal as any });
        } else {
          // Fall back to responseFormat for older models
          response = await geminiModel.generateContent({
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
              responseMimeType: "application/json",
            },
          }, { signal: controller.signal as any });
        }
      } catch (genError) {
        // If schema or mime type features fail, fall back to basic prompt
        logger.warn('Advanced JSON features failed, falling back to basic prompt', { error: genError });
        response = await geminiModel.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${input.prompt}\n\nIMPORTANT: Respond with ONLY a valid JSON object. No markdown, no code fences, no commentary.\nSchema: ${input.schema.description || JSON.stringify(input.schema._def)}`,
                }
              ]
            }
          ],
          generationConfig: {
            temperature,
          },
        }, { signal: controller.signal as any });
      }
      
      clearTimeout(timeoutId);
      
      // Get response text and try to parse as JSON
      const text = response.response.text();
      if (!text) {
        throw new AIProviderError({
          code: 'EMPTY_RESPONSE',
          message: 'Google model returned empty response',
        });
      }

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new AIProviderError({
          code: 'NO_JSON_FOUND',
          message: 'Could not find JSON object in response',
          details: { preview: text.slice(0, 500) },
        });
      }

      let jsonResult;
      try {
        jsonResult = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new AIProviderError({
          code: 'INVALID_JSON',
          message: 'Failed to parse JSON response',
          details: { preview: jsonMatch[0].slice(0, 500) },
        });
      }
      
      // Validate against schema
      try {
        const validatedJson = input.schema.parse(jsonResult);
        
        // Get token usage if available, or estimate based on text length
        let tokensUsed = response.response.usageMetadata?.totalTokens;
        
        if (!tokensUsed) {
          // Estimate tokens based on text length (rough approximation)
          const promptText = input.prompt || '';
          const responseText = text || '';
          const totalChars = promptText.length + responseText.length;
          tokensUsed = Math.ceil(totalChars / 4); // ~4 chars per token
        }
        
        return {
          json: validatedJson,
          raw: response,
          tokensUsed,
          tokenUsage: {
            inputTokens: Math.ceil(tokensUsed * 0.4), // Rough estimate: 40% input, 60% output
            outputTokens: Math.ceil(tokensUsed * 0.6),
          }
        };
      } catch (validationError) {
        throw new AIProviderError({
          code: 'SCHEMA_VALIDATION',
          message: 'Response did not match expected schema',
          details: { 
            error: validationError,
            preview: JSON.stringify(jsonResult).slice(0, 500)
          },
        });
      }
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        throw new AIProviderError({
          code: 'TIMEOUT',
          message: `Request timed out after ${timeoutMs}ms`,
        });
      }
      
      // Handle rate limiting
      if (error.status === 429 || (error.message && error.message.includes('quota'))) {
        throw new AIProviderError({
          code: 'RATE_LIMIT',
          message: 'Rate limit or quota exceeded',
          details: error,
        });
      }
      
      // Handle authentication errors
      if (error.status === 401 || (error.message && error.message.includes('auth'))) {
        throw new AIProviderError({
          code: 'AUTH',
          message: 'Authentication failed',
          details: error,
        });
      }
      
      // If it's already an AIProviderError, rethrow
      if (error instanceof AIProviderError) {
        throw error;
      }
      
      // Handle other errors
      throw new AIProviderError({
        code: 'UNKNOWN',
        message: error.message || 'Unknown error',
        details: error,
      });
    }
  }
}