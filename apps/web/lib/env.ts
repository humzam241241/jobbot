// apps/web/lib/env.ts
import { hasAnyProvider } from "./providers";

// Add debugging for environment variables
const debugEnv = (key: string, value: any) => {
  console.log(`[ENV] ${key}: ${value ? 'Found' : 'Not found'}`);
  return value;
};

// For demo purposes, provide fallback API keys if none are set
// IMPORTANT: In production, you should never hardcode API keys
const DEMO_GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY";
const DEMO_OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";

export const env = {
  nodeRuntime: "nodejs" as const,
  adminEmails: (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean),
  openaiKey: debugEnv("OPENAI_API_KEY", process.env.OPENAI_API_KEY || DEMO_OPENAI_API_KEY),
  openrouterKey: debugEnv("OPENROUTER_API_KEY", process.env.OPENROUTER_API_KEY),
  anthropicKey: debugEnv("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
  googleKey: debugEnv("GOOGLE_API_KEY", process.env.GOOGLE_API_KEY || DEMO_GOOGLE_API_KEY),
};

// Deprecated: use hasAnyProvider from providers.ts instead
export function anyAIKey() {
  return hasAnyProvider();
}

export function providersAvailable() {
  return {
    openai: !!env.openaiKey,
    openrouter: !!env.openrouterKey,
    anthropic: !!env.anthropicKey,
    google: !!env.googleKey,
    any: hasAnyProvider(),
  };
}
