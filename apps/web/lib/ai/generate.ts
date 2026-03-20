import { generateWithAuto, ProviderChoice } from "./router";
import type { Usage } from "./types";

/**
 * Thin wrapper around generateWithAuto that returns { text, usage }
 * for use by the generator module.
 */
export async function generateAny(
  provider: string | undefined,
  opts: { system: string; user: string; model?: string }
): Promise<{ text: string; usage: Usage }> {
  const prompt = `${opts.system}\n\n${opts.user}`;
  const preferred = (provider || "auto") as ProviderChoice;

  const result = await generateWithAuto(prompt, preferred);

  // Return the result as text (JSON-stringified) with stub usage info
  const text = typeof result === "string"
    ? result
    : JSON.stringify(result, null, 2);

  const usage: Usage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model: opts.model || "unknown",
    provider: result.providerUsed || preferred,
  };

  return { text, usage };
}
