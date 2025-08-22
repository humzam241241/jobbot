// apps/web/lib/ai/modelMap.ts
export type Provider = 'google' | 'openai' | 'anthropic';

/** Choose a valid default for a provider if the incoming model doesn't match it. */
export function pickModel(provider: Provider, requested?: string): string {
  const byDefault: Record<Provider, string> = {
    google: 'gemini-2.5-pro',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
  };

  const okFor = {
    google: (m?: string) => !!m && /^gemini/i.test(m),
    openai: (m?: string) => !!m && /^(gpt|o3|omni|mini)/i.test(m),
    anthropic: (m?: string) => !!m && /^claude-/i.test(m),
  }[provider];

  return okFor(requested) ? (requested as string) : byDefault[provider];
}
