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
    this.defaultModel = 'gemini-2.5-pro'; // Default to Gemini 2.5 Pro

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
      
      // Attempt to use the most robust JSON generation method available
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
        
        // Get token usage if available, or estimate based on text length
        let tokensUsed = response.response.usageMetadata?.totalTokens;
        
        if (!tokensUsed) {
          // Estimate tokens based on text length (rough approximation)
          const promptText = input.prompt || '';
          const responseText = content || '';
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
