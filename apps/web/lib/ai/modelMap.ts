export const defaultOrder: Array<'openai'|'anthropic'|'google'> = ['openai','anthropic','google'];

export const models = {
  openai: { default: 'gpt-4o-mini' }, // safe, cheap-ish, good formatting
  anthropic: { default: 'claude-3-5-sonnet-20240620' },
  google: { default: 'gemini-1.5-pro' },
} as const;