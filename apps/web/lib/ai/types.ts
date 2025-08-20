export type GenArgs = { system: string; user: string; model?: string };
export type Usage = { inputTokens?: number; outputTokens?: number; totalTokens?: number; model: string; provider: string };
export type GenResult = { text: string; usage: Usage };
export interface AIAdapter {
  name: "openai" | "openrouter" | "anthropic" | "google";
  canUse(): boolean;
  normalizeModel(m?: string): string;
  generate(args: GenArgs): Promise<GenResult>;
}
