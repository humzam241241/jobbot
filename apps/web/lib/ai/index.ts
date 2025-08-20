import type { AIAdapter, GenArgs, GenResult } from "./types";
import { OpenAIAdapter } from "./openai";
import { OpenRouterAdapter } from "./openrouter";
import { AnthropicAdapter } from "./anthropic";
import { GeminiAdapter } from "./gemini";
import { hasAnyProvider } from "@/lib/providers";

export const ADAPTERS: AIAdapter[] = [
  GeminiAdapter,
  AnthropicAdapter,
  OpenAIAdapter,
  OpenRouterAdapter,
];

export function pickAdapter(name?: string): AIAdapter | null {
  if (!name || name.toLowerCase() === "auto") {
    return ADAPTERS.find(a => a.canUse()) || null;
  }
  const wanted = name.toLowerCase();
  const found = ADAPTERS.find(a => a.name === wanted);
  return found && found.canUse() ? found : null;
}

export async function generateAny(
  provider: string | undefined,
  args: GenArgs
): Promise<GenResult & { providerTried: string[] }> {
  const tried: string[] = [];
  
  console.log(`[generateAny] Starting with provider: ${provider || 'auto'}`);

  // For demo purposes, we'll use a mock response if no providers are configured
  if (!hasAnyProvider()) {
    console.warn("[generateAny] No AI provider API keys configured. Using mock response for demo purposes.");
    
    // Return a mock response with placeholder text
    return { 
      text: `<article>
        <h1>Demo Content (No API Keys Configured)</h1>
        <p>This is placeholder content generated because no API keys are configured.</p>
        <p>To use real AI generation, please add API keys to your .env.local file.</p>
        <p>For example: GOOGLE_API_KEY=your_key_here</p>
      </article>`,
      usage: { provider: "mock", model: "demo", totalTokens: 0 },
      providerTried: ["mock"] 
    };
  }

  // Case 1: A specific provider is requested. Respect the user's choice and fail if it doesn't work.
  if (provider && provider !== "auto") {
    console.log(`[generateAny] Using specific provider: ${provider}`);
    const requestedAdapter = pickAdapter(provider);
    if (!requestedAdapter) {
      console.error(`[generateAny] Requested provider "${provider}" is not available or configured`);
      throw new Error(`Requested provider "${provider}" is not available or configured. Check your API key.`);
    }
    
    tried.push(requestedAdapter.name);
    try {
      console.log(`[generateAny] Generating with ${requestedAdapter.name}`);
      const norm = { ...args, model: requestedAdapter.normalizeModel(args.model) };
      const result = await requestedAdapter.generate(norm);
      console.log(`[generateAny] Successfully generated with ${requestedAdapter.name}`);
      return { ...result, providerTried: tried };
    } catch (error: any) {
      console.error(`[generateAny] Provider ${provider} failed:`, error);
      // Re-throw the specific error to the client to be displayed. No fallback.
      throw new Error(`The selected provider "${provider}" failed. Error: ${error.message}`);
    }
  }

  // Case 2: "auto" mode. Find the first available provider that works.
  const availableAdapters = ADAPTERS.filter(a => a.canUse());
  console.log(`[generateAny] Auto mode with ${availableAdapters.length} available adapters: ${availableAdapters.map(a => a.name).join(', ')}`);
  
  let lastErr: any = null;

  for (const adapter of availableAdapters) {
    tried.push(adapter.name);
    try {
      console.log(`[generateAny] Auto-trying provider: ${adapter.name}`);
      // When in auto mode, we don't have a specific model, so we let the adapter pick its default.
      const norm = { ...args, model: adapter.normalizeModel(args.model === 'auto' ? undefined : args.model) };
      // If successful, we return immediately.
      const result = await adapter.generate(norm);
      console.log(`[generateAny] Auto-provider ${adapter.name} succeeded.`);
      return { ...result, providerTried: tried };
    } catch (e: any) {
      console.warn(`[generateAny] Auto-provider ${adapter.name} failed:`, e.message);
      lastErr = e; // Keep track of the last error and continue to the next adapter.
    }
  }

  // If we get here, all available providers failed.
  if (lastErr) {
     console.error(`[generateAny] All available AI providers failed. Tried: ${tried.join(", ")}`);
     throw new Error(`All available AI providers failed. Tried: ${tried.join(", ")}. Please check your API keys. Last error: ${lastErr.message}`);
  }

  // This case covers if no adapters were available but anyAIKey was true.
  console.error("[generateAny] No AI providers could be used");
  throw new Error("No AI providers could be used. Please check your API key configuration.");
}
