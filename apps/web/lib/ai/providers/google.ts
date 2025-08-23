import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createLogger } from '@/lib/logger';

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

export class GoogleProvider {
  private modelId: string;
  private client: GoogleGenerativeAI;

  constructor(modelId = "gemini-2.5-pro") {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      logger.error('GOOGLE_API_KEY is not set');
      throw new Error("GOOGLE_API_KEY is not set");
    }
    this.client = new GoogleGenerativeAI(key);
    this.modelId = modelId;
    logger.info('GoogleProvider initialized', { modelId });
  }

  async generate(prompt: string): Promise<GoogleResult> {
    logger.info('Generating with Google', { modelId: this.modelId });

    try {
      // Use responses.generate (v1beta), which supports responseSchema
      const result = await this.client.responses.generate({
        model: this.modelId,
        input: [{ role: "user", parts: [{ text: prompt }] }],
        // generationConfig instead of generation_config
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 32768,
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              resume_markdown: { type: SchemaType.STRING },
              cover_letter_markdown: { type: SchemaType.STRING },
              ats_report: {
                type: SchemaType.OBJECT,
                properties: {
                  score: { type: SchemaType.NUMBER },
                  matched_keywords: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                  },
                  missing_keywords: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                  },
                  notes: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                  }
                },
                required: ["score", "matched_keywords", "missing_keywords"]
              }
            },
            required: ["resume_markdown", "cover_letter_markdown", "ats_report"]
          }
        }
      });

      const text = result?.response?.text?.();
      if (!text || !text.trim()) {
        const finish = result?.response?.candidates?.[0]?.finishReason;
        logger.error('No content from Google', { finish });
        throw Object.assign(
          new Error("NO_CONTENT_FROM_GOOGLE"), 
          { code: "NO_CONTENT_FROM_GOOGLE", finish }
        );
      }

      try {
        const parsed = JSON.parse(text) as GoogleResult;
        logger.info('Successfully parsed Google response', {
          resumeLength: parsed.resume_markdown.length,
          coverLetterLength: parsed.cover_letter_markdown.length,
          atsScore: parsed.ats_report.score
        });
        return parsed;
      } catch (e) {
        logger.error('Failed to parse Google response', { 
          error: e,
          text: text.slice(0, 100) + '...'
        });
        throw Object.assign(
          new Error("GOOGLE_JSON_PARSE_ERROR"), 
          { code: "GOOGLE_JSON_PARSE_ERROR", raw: text }
        );
      }
    } catch (e: any) {
      // If it's already an error we created, rethrow it
      if (e.code === "NO_CONTENT_FROM_GOOGLE" || e.code === "GOOGLE_JSON_PARSE_ERROR") {
        throw e;
      }

      // Otherwise, wrap it in a provider error
      logger.error('Google provider error', {
        error: {
          message: e.message,
          code: e.code,
          status: e.status,
          details: e.details
        }
      });

      throw Object.assign(
        new Error("GOOGLE_PROVIDER_ERROR"),
        { 
          code: "GOOGLE_PROVIDER_ERROR",
          cause: e,
          details: {
            message: e.message,
            code: e.code,
            status: e.status,
            details: e.details
          }
        }
      );
    }
  }
}