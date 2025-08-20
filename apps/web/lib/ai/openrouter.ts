import type { AIAdapter, GenArgs, GenResult } from "./types";
import { env } from "@/lib/env";

async function callOpenRouter(model: string, system: string, user: string): Promise<GenResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${env.openrouterKey}`,
      ...(env.siteUrl ? { "HTTP-Referer": env.siteUrl } : {}),
      ...(env.appName ? { "X-Title": env.appName } : {}),
    },
    body: JSON.stringify({
      model, temperature: 0.3,
      messages: [{ role:"system", content: system }, { role:"user", content: user }],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${text.slice(0,400)}`);
  const data = JSON.parse(text);
  const content = data?.choices?.[0]?.message?.content || "";
  const u:any = data?.usage || {};
  return { text: content, usage: {
    inputTokens: Number(u?.prompt_tokens||0),
    outputTokens: Number(u?.completion_tokens||0),
    totalTokens: Number(u?.total_tokens||((u?.prompt_tokens||0)+(u?.completion_tokens||0))),
    model, provider: "openrouter"
  }};
}

export const OpenRouterAdapter: AIAdapter = {
  name: "openrouter",
  canUse() { return !!env.openrouterKey; },
  normalizeModel(m?: string) {
    // OpenRouter uses full model names, so we just pass it through or use a sensible default.
    return m || "openai/gpt-4o-mini";
  },
  async generate({ system, user, model }: GenArgs): Promise<GenResult> {
    const chosen = this.normalizeModel(model);
    try {
      return await callOpenRouter(chosen, system, user);
    } catch (e:any) {
      // auto fallback paid → free
      if (/403|404|do not have access|not found/i.test(String(e?.message||"")) && !chosen.endsWith(":free")) {
        const freeModel = "deepseek/deepseek-r1:free";
        return await callOpenRouter(freeModel, system, user);
      }
      throw e;
    }
  }
};
