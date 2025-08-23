import { GoogleProvider } from "./providers/google";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-router');

export type ProviderChoice = "google" | "openai" | "anthropic" | "auto";

export type RouterResult = {
  resume_markdown: string;
  cover_letter_markdown: string;
  ats_report: {
    score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    notes: string[];
  };
  providerUsed: ProviderChoice;
};

const withTimeout = <T>(p: Promise<T>, ms = 60000) => {
  logger.info('Starting operation with timeout', { timeoutMs: ms });
  
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      logger.warn('Operation timed out');
      reject(Object.assign(
        new Error("PROVIDER_TIMEOUT"), 
        { code: "PROVIDER_TIMEOUT" }
      ));
    }, ms);

    p.then(v => {
      clearTimeout(t);
      resolve(v);
    }).catch(e => {
      clearTimeout(t);
      reject(e);
    });
  });
};

export async function generateWithAuto(
  prompt: string, 
  preferred: ProviderChoice = "auto"
): Promise<RouterResult> {
  const order: ProviderChoice[] =
    preferred === "auto" 
      ? ["google", "openai", "anthropic"] 
      : [preferred, ...["google","openai","anthropic"].filter(p => p !== preferred) as ProviderChoice[]];

  logger.info('Starting generation', { 
    preferred,
    providerOrder: order,
    promptLength: prompt.length
  });

  const errors: any[] = [];

  for (const p of order) {
    try {
      logger.info('Trying provider', { provider: p });

      if (p === "google") {
        const g = new GoogleProvider("gemini-2.5-pro");
        const r = await withTimeout(g.generate(prompt));
        logger.info('Google provider succeeded');
        return { ...r, providerUsed: "google" };
      }

      if (p === "openai") {
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
          logger.error('OpenAI API key missing');
          throw Object.assign(
            new Error("OPENAI_MISSING_KEY"), 
            { code: "OPENAI_MISSING_KEY" }
          );
        }

        const client = new OpenAI({ apiKey: key });
        const resp = await withTimeout(
          client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        );

        const content = resp.choices?.[0]?.message?.content ?? "{}";
        const json = typeof content === "string" ? content : JSON.stringify(content);
        
        try {
          const parsed = JSON.parse(json);
          logger.info('OpenAI provider succeeded');
          return { ...parsed, providerUsed: "openai" };
        } catch (e) {
          logger.error('Failed to parse OpenAI response', { 
            error: e,
            content: content.slice(0, 100) + '...'
          });
          throw Object.assign(
            new Error("OPENAI_JSON_PARSE_ERROR"),
            { code: "OPENAI_JSON_PARSE_ERROR", raw: content }
          );
        }
      }

      if (p === "anthropic") {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
          logger.error('Anthropic API key missing');
          throw Object.assign(
            new Error("ANTHROPIC_MISSING_KEY"), 
            { code: "ANTHROPIC_MISSING_KEY" }
          );
        }

        const anthropic = new Anthropic({ apiKey: key });
        const resp = await withTimeout(
          anthropic.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 4000,
            system: "Return only JSON matching the requested schema.",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
          })
        );

        const content = resp?.content?.[0];
        const text = content && content.type === "text" ? content.text : "";
        
        try {
          const parsed = JSON.parse(text || "{}");
          logger.info('Anthropic provider succeeded');
          return { ...parsed, providerUsed: "anthropic" };
        } catch (e) {
          logger.error('Failed to parse Anthropic response', { 
            error: e,
            text: text?.slice(0, 100) + '...'
          });
          throw Object.assign(
            new Error("ANTHROPIC_JSON_PARSE_ERROR"),
            { code: "ANTHROPIC_JSON_PARSE_ERROR", raw: text }
          );
        }
      }
    } catch (e: any) {
      logger.error('Provider failed', {
        provider: p,
        error: {
          code: e.code,
          message: e.message,
          details: e.details
        }
      });

      errors.push({ 
        provider: p, 
        code: e?.code || "UNKNOWN", 
        message: e?.message || String(e) 
      });
      continue;
    }
  }

  const err = new Error("All AI providers failed");
  Object.assign(err, { 
    code: "ALL_PROVIDERS_FAILED",
    details: errors 
  });
  
  logger.error('All providers failed', { errors });
  throw err;
}