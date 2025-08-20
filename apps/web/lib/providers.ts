export type Provider = "openai" | "anthropic" | "openrouter" | "google";

export interface ProviderChoice {
  provider: Provider;
  key: string;
  model: string;
  baseUrl: string;
  headers: Record<string, string>;
}

export function getConfiguredProviders() {
  return {
    openai: process.env.OPENAI_API_KEY || "",
    anthropic: process.env.ANTHROPIC_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""
  };
}

export function chooseProvider(p: Provider, model?: string): ProviderChoice {
  const keys = getConfiguredProviders();
  if (!keys[p]) throw new Error(`Missing API key for ${p}`);
  
  if (p === "openai") {
    return { 
      provider: p, 
      key: keys.openai, 
      model: model ?? "gpt-4o-mini",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      headers: { "Authorization": `Bearer ${keys.openai}`, "Content-Type": "application/json" } 
    };
  }
  
  if (p === "anthropic") {
    return { 
      provider: p, 
      key: keys.anthropic, 
      model: model ?? "claude-3-haiku-20240307",
      baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
      headers: { "x-api-key": keys.anthropic, "anthropic-version": "2023-06-01", "Content-Type": "application/json" } 
    };
  }
  
  if (p === "openrouter") {
    return { 
      provider: p, 
      key: keys.openrouter, 
      model: model ?? "openai/gpt-4o-mini",
      baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      headers: { "Authorization": `Bearer ${keys.openrouter}`, "Content-Type": "application/json" } 
    };
  }
  
  // google / gemini
  return { 
    provider: p, 
    key: keys.google, 
    model: model ?? "gemini-2.5-pro",
    baseUrl: process.env.GOOGLE_GENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
    headers: { "Content-Type": "application/json" } 
  };
}

export function hasAnyProvider(): boolean {
  const keys = getConfiguredProviders();
  return !!(keys.openai || keys.anthropic || keys.openrouter || keys.google);
}
