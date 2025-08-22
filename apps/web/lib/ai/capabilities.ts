export const ProviderDefaultModels = {
  google: 'gemini-2.5-pro',
  openai: 'gpt-4o-mini-2024-07-18',
  anthropic: 'claude-3-7-sonnet-20250219', // supports response_format
} as const;

export function supportsJsonSchema(provider: 'google'|'openai'|'anthropic', model?: string) {
  if (provider === 'anthropic') {
    return (model ?? ProviderDefaultModels.anthropic).startsWith('claude-3-7-');
  }
  if (provider === 'openai') return true; // recent OpenAI models support response_format: {type:'json_object'}
  if (provider === 'google') return true; // but we'll prefer responseMimeType over schema to avoid 400s
  return false;
}
