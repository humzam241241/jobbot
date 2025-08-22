export const ProviderDefaultModels = {
  google: 'gemini-2.5-pro',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-sonnet-20240229',
} as const;

export type Provider = keyof typeof ProviderDefaultModels;

export function supportsJsonSchema(provider: Provider, model?: string): boolean {
  if (provider === 'openai') return true; // All recent OpenAI models support response_format
  return false; // For safety, assume others don't support complex JSON schema
}

export function getDefaultModel(provider: Provider): string {
  return ProviderDefaultModels[provider];
}