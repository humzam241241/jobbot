import { logger } from '@/lib/logging/logger';

export type Provider = 'google' | 'openai' | 'anthropic';

const MODEL_PATTERNS = {
  google: /^gemini/i,
  openai: /^(gpt|o3|omni|mini|4o)/i,
  anthropic: /^claude/i,
} as const;

const DEFAULT_MODELS = {
  google: 'gemini-1.5-pro',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-latest',
} as const;

const FALLBACK_MODELS = {
  google: {
    'gemini-2.5-pro': 'gemini-1.5-pro',
    'gemini-2.5-pro-latest': 'gemini-1.5-pro',
  },
  anthropic: {
    'claude-3-5-sonnet-latest': 'claude-3-sonnet-20240229',
  },
} as const;

export function modelFor(provider: Provider, requested?: string): string {
  // If no model requested, use default
  if (!requested?.trim()) {
    return DEFAULT_MODELS[provider];
  }

  // Check if model matches provider pattern
  if (MODEL_PATTERNS[provider].test(requested)) {
    // Check if model needs remapping
    const fallbacks = FALLBACK_MODELS[provider] as Record<string, string>;
    if (fallbacks && fallbacks[requested]) {
      logger.info(`Remapping ${requested} to ${fallbacks[requested]} for ${provider}`);
      return fallbacks[requested];
    }
    return requested;
  }

  // Model doesn't match provider, use default
  logger.warn(`Model ${requested} not valid for ${provider}, using default ${DEFAULT_MODELS[provider]}`);
  return DEFAULT_MODELS[provider];
}

export function validateProvider(provider: string): provider is Provider {
  return ['google', 'openai', 'anthropic'].includes(provider);
}

export function getProviderKey(provider: Provider): string {
  return `${provider.toUpperCase()}_API_KEY`;
}

export function checkProviderAvailable(provider: Provider): boolean {
  const key = process.env[getProviderKey(provider)];
  if (!key) {
    logger.warn(`${provider} API key missing`);
    return false;
  }
  return true;
}
