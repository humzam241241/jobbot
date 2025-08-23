import { openaiRewrite } from "./providers/openai";
import { anthropicRewrite } from "./providers/anthropic";
import { googleRewrite } from "./providers/google";
import { openrouterRewrite } from "./providers/openrouter";
import { createLogger } from '@/lib/logger';

const logger = createLogger('ai-router');

type Args = {
  model?: string;
  jobDescription: string;
  resumeMarkdown: string;
  temperature?: number;
  maxTokens?: number;
};

type Provider = "openai" | "anthropic" | "google" | "openrouter";

export async function autoRewrite(
  args: Args, 
  order: Provider[] = ["openrouter", "google", "openai", "anthropic"]
) {
  const impl = {
    openai: openaiRewrite,
    anthropic: anthropicRewrite,
    google: googleRewrite,
    openrouter: openrouterRewrite,
  } as const;

  logger.info('Starting auto rewrite', {
    providerOrder: order,
    model: args.model,
    hasJobDescription: Boolean(args.jobDescription),
    resumeLength: args.resumeMarkdown.length
  });

  const errors: any[] = [];
  for (const p of order) {
    try {
      logger.info('Trying provider', { provider: p });
      const res = await impl[p](args as any);
      if (res.ok) {
        logger.info('Provider succeeded', { 
          provider: p, 
          modelUsed: res.modelUsed 
        });
        return res;
      }
      logger.warn('Provider failed', { 
        provider: p, 
        error: res.error 
      });
      errors.push({ provider: p, ...(res as any).error });
    } catch (e) {
      logger.error('Unexpected error from provider', {
        provider: p,
        error: e
      });
      errors.push({ 
        provider: p, 
        code: 'UNEXPECTED_ERROR',
        message: e instanceof Error ? e.message : 'Unknown error'
      });
    }
  }

  logger.error('All providers failed', { errors });
  return { 
    ok: false as const, 
    error: { 
      code: "ALL_PROVIDERS_FAILED", 
      message: "All AI providers failed", 
      raw: errors 
    } 
  };
}