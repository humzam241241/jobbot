import { z } from 'zod';

export type GenInput = { 
  prompt: string; 
  schema: z.ZodSchema<any>; 
  timeoutMs?: number;
  temperature?: number;
  model?: string;
};

export type GenResult = { 
  json: any; 
  raw: any; 
  tokensUsed?: number;
};

export interface Provider {
  name: "openai" | "anthropic" | "google";
  available(): boolean; // env present?
  generate(input: GenInput): Promise<GenResult>;
}

export type AIError = {
  code: 'PROVIDER_UNAVAILABLE' | 'RATE_LIMIT' | 'TIMEOUT' | 'AUTH' | 'SERVER' | 'UNKNOWN';
  message: string;
  details?: any;
};

export class AIProviderError extends Error {
  code: AIError['code'];
  details?: any;

  constructor(error: AIError) {
    super(error.message);
    this.name = 'AIProviderError';
    this.code = error.code;
    this.details = error.details;
  }
}
