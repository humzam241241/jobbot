import { Anthropic } from "@anthropic-ai/sdk";
import type { AIAdapter, GenArgs, GenResult } from "./types";
import { env } from "@/lib/env";

export const AnthropicAdapter: AIAdapter = {
  name: "anthropic",
  canUse() { return !!env.anthropicKey; },
  normalizeModel(m?: string) {
    const wanted = (m || "claude-3-5-sonnet-20240620").toLowerCase();
    if (wanted.includes("haiku")) return "claude-3-haiku-20240307";
    return "claude-3-5-sonnet-20240620"; // Default to latest Sonnet
  },
  async generate({ system, user, model }: GenArgs): Promise<GenResult> {
    try {
      const client = new Anthropic({ apiKey: env.anthropicKey });
      const chosen = AnthropicAdapter.normalizeModel(model);
      
      const r:any = await client.messages.create({
        model: chosen, 
        max_tokens: 4096, // Increased for resume generation
        temperature: 0.3,
        system, 
        messages: [{ role:"user", content: user }]
      });
      
      const text = (r.content || []).map((p:any)=>("text" in p ? p.text : "")).join("") || "";
      const u:any = r.usage || {};
      
      return { text, usage: {
        inputTokens: Number(u?.input_tokens||0),
        outputTokens: Number(u?.output_tokens||0),
        totalTokens: Number(u?.input_tokens||0)+Number(u?.output_tokens||0),
        model: chosen, provider: "anthropic"
      }};
    } catch (error: any) {
      if (error.status === 429) {
        throw new Error(`Anthropic Quota Exceeded: ${error.message}`);
      }
      console.error("Anthropic API error:", error);
      // Don't fallback - respect user's model choice
      throw error;
    }
  }
};
