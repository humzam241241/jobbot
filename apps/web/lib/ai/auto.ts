import { defaultOrder } from './modelMap';
import type { ProviderResult, ProviderCallArgs } from './types';
import { openaiRewrite } from './providers/openai';
import { anthropicRewrite } from './providers/anthropic';
import { googleRewrite } from './providers/google';

const impl = { openai: openaiRewrite, anthropic: anthropicRewrite, google: googleRewrite };

export async function autoRewrite(args: ProviderCallArgs, order = defaultOrder) {
  const errors: any[] = [];
  for (const p of order) {
    const res: ProviderResult = await impl[p](args);
    if (res.ok) return { ...res, providerUsed: p };
    errors.push({ provider: p, ...res.error });
  }
  return { ok:false, error: { code: 'ALL_PROVIDERS_FAILED', message: 'All AI providers failed', raw: errors } };
}
