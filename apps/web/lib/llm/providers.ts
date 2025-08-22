// apps/web/lib/llm/providers.ts
import { env } from '../env';

export type LlmProvider = 'openai' | 'anthropic' | 'gemini';

export type ProviderRequest = { 
  requested?: { provider?: LlmProvider; model?: string }, 
  purpose: 'profile-extract' | 'resume-tailor' | 'cover-letter' | 'ats-report' 
};

export type ResolvedProvider = { provider: LlmProvider; model: string };

export function resolveProvider(req: ProviderRequest): ResolvedProvider {
  const has = {
    openai: !!env.OPENAI_API_KEY,
    anthropic: !!env.ANTHROPIC_API_KEY,
    gemini: !!env.GEMINI_API_KEY,
  };
  
  const order: ResolvedProvider[] = [
    { provider: 'openai', model: 'gpt-4o-2024-05-13' },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-latest' },
    { provider: 'gemini', model: 'gemini-2.5-pro' },
  ];
  
  const isUsable = (p: LlmProvider) => p === 'openai' ? has.openai : p === 'anthropic' ? has.anthropic : has.gemini;

  const rp = req.requested?.provider, rm = req.requested?.model;
  if (rp && isUsable(rp)) return { provider: rp, model: rm || order.find(o => o.provider === rp)!.model };

  const first = order.find(o => isUsable(o.provider));
  if (!first) throw new Error('No LLM providers are configured.');
  
  if (rp && !isUsable(rp)) {
    console.warn(`[DEV:router] Requested ${rp} but missing API key; falling back to ${first.provider}`);
  }
  
  return first;
}

/**
 * Get all available providers and their models
 * @returns Object with available providers and their models
 */
export function getAvailableProviders() {
  return {
    openai: {
      available: env.hasOpenAI,
      models: env.hasOpenAI ? [
        'gpt-4o-2024-05-13',
        'gpt-4-turbo',
        'gpt-4o',
        'gpt-4',
        'gpt-3.5-turbo'
      ] : []
    },
    anthropic: {
      available: env.hasAnthropic,
      models: env.hasAnthropic ? [
        'claude-3-5-sonnet-latest',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1'
      ] : []
    },
    gemini: {
      available: env.hasGemini,
      models: env.hasGemini ? [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'gemini-1.0-pro'
      ] : []
    }
  };
}