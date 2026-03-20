import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from '@/lib/logger';
import { Provider, GenInput, GenResult, AIProviderError } from './types';

const logger = createLogger('google-provider');

export type GoogleResult = {
  resume_markdown: string;
  cover_letter_markdown: string;
  ats_report: {
    score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    notes: string[];
  };
};

export class GoogleProvider implements Provider {
  name = "google" as const;
  private modelId: string;
  private client: GoogleGenerativeAI | null = null;

  constructor(modelId = "gemini-2.5-pro") {
    this.modelId = modelId;
  }

  available(): boolean {
    return Boolean(process.env.GOOGLE_API_KEY);
  }

  private getClient(): GoogleGenerativeAI {
    if (this.client) return this.client;
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new AIProviderError({
        code: 'AUTH',
        message: 'GOOGLE_API_KEY is not set',
      });
    }
    this.client = new GoogleGenerativeAI(key);
    logger.info('GoogleProvider initialized', { modelId: this.modelId });
    return this.client;
  }

  async generate(input: GenInput): Promise<GenResult> {
    logger.info('Generating with Google', { modelId: this.modelId });

    try {
      const model = this.getClient().getGenerativeModel({ model: this.modelId });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: input.temperature ?? 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 32768,
          responseMimeType: "application/json"
        }
      });

      const text = result?.response?.text?.();
      if (!text || !text.trim()) {
        const finish = result?.response?.candidates?.[0]?.finishReason;
        logger.error('No content from Google', { finish });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'No content from Google',
          details: { finish },
        });
      }

      try {
        const parsed = JSON.parse(text);
        return { json: parsed, raw: text };
      } catch (e) {
        logger.error('Failed to parse Google response', {
          error: e,
          text: text.slice(0, 100) + '...'
        });
        throw new AIProviderError({
          code: 'SERVER',
          message: 'Failed to parse Google JSON response',
          details: { raw: text.slice(0, 200) },
        });
      }
    } catch (e: any) {
      if (e instanceof AIProviderError) throw e;

      logger.error('Google provider error', {
        error: { message: e.message, code: e.code, status: e.status }
      });

      throw new AIProviderError({
        code: 'SERVER',
        message: e.message || 'Google provider error',
        details: { originalCode: e.code, status: e.status },
      });
    }
  }
}