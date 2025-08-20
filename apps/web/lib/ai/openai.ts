import OpenAI from "openai";
import type { AIAdapter, GenArgs, GenResult } from "./types";
import { env } from "@/lib/env";

const MAP: Record<string,string> = { "gpt4o":"gpt-4o", "gpt-4-o":"gpt-4o", "gpt4o-mini":"gpt-4o-mini" };
const ALLOWED = new Set(["gpt-4o","gpt-4o-mini","o3-mini"]);

export const OpenAIAdapter: AIAdapter = {
  name: "openai",
  canUse() { return !!env.openaiKey; },
  normalizeModel(m?: string) {
    const wanted = (m || env.defaultModel).toLowerCase();
    const x = MAP[wanted] || wanted;
    return ALLOWED.has(x) ? x : "gpt-4o-mini";
  },
  async generate({ system, user, model }: GenArgs): Promise<GenResult> {
    const client = new OpenAI({ apiKey: env.openaiKey });
    const chosen = OpenAIAdapter.normalizeModel(model);
    try {
      const r = await client.chat.completions.create({
        model: chosen,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const text = r.choices[0]?.message.content || "";
      const u = r.usage;
      return { text, usage: { inputTokens: u?.prompt_tokens, outputTokens: u?.completion_tokens, totalTokens: u?.total_tokens, model: chosen, provider: "openai" }};
    } catch (error: any) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429 || error.type === 'insufficient_quota') {
          throw new Error(`OpenAI Quota Exceeded: ${error.message}`);
        }
      }
      // Re-throw other errors
      throw error;
    }
  }
};
