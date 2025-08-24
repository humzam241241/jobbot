export interface RouterResult<T = any> {
  content: T;
  provider: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface PromptInput {
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

export type Provider = 'auto' | 'google' | 'openai' | 'anthropic';