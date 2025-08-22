export type AICompany = 'auto' | 'anthropic' | 'openai' | 'google' | 'openrouter';

export type AIModel =
  | 'auto'  // Default - will use best available
  // Anthropic Models
  | 'claude-4'          // Latest and most capable
  | 'claude-3-opus'     // Production ready
  | 'claude-3-sonnet'   // Balanced performance
  | 'claude-3-haiku'    // Fast and efficient
  // OpenAI Models
  | 'gpt-5'             // Latest and most capable
  | 'gpt-4-turbo'       // Current best available
  | 'gpt-4'             // Standard GPT-4
  | 'gpt-3.5-turbo'     // Fast and efficient
  // Google Models
  | 'gemini-2.5-pro'    // Latest and most capable
  | 'gemini-2.0-pro'    // Production ready
  | 'gemini-1.5-pro'    // Current best available
  | 'gemini-1.5-ultra'  // Enhanced capabilities
  // OpenRouter Models
  | 'openrouter/mistral-large'   // Latest Mistral model
  | 'openrouter/deepseek-coder'  // Specialized for code
  | 'openrouter/solar'           // Solar model
  | 'openrouter/mixtral-8x7b';   // Mixtral model

export interface AIProvider {
  name: string;
  model: AIModel;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationOptions {
  provider: AIProvider;
  mode: 'resume' | 'cover-letter' | 'both';
  style?: string;
  tone?: string;
  format?: string;
}