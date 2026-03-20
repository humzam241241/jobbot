import OpenAI from "openai";
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { SYSTEM_PROMPT, buildUserPrompt } from "./sharedPrompts";
import { Provider, GenInput, GenResult, AIProviderError } from "./types";

export async function openaiRewrite(args: {
  model?: string;
  jobDescription: string;
  resumeMarkdown: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = args.model ?? "gpt-4o-mini";
  try {
    const res = await withBackoff(() =>
      client.chat.completions.create({
        model,
        temperature: args.temperature ?? 0.2,
        max_tokens: args.maxTokens ?? 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(args.jobDescription, args.resumeMarkdown) },
        ],
      })
    );
    const content = res.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("NO_CONTENT_FROM_OPENAI");
    return { ok: true as const, content, modelUsed: model, providerUsed: "openai" };
  } catch (e: any) {
    return {
      ok: false as const,
      error: {
        code: String(e?.status ?? e?.code ?? "OPENAI_ERROR"),
        message: "OpenAI request failed.",
        raw: e
      }
    };
  }
}

export class OpenAIProvider implements Provider {
  name = "openai" as const;

  available(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(input: GenInput): Promise<GenResult> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const model = input.model ?? "gpt-4o-mini";
    try {
      const res = await withBackoff(() =>
        client.chat.completions.create({
          model,
          temperature: input.temperature ?? 0.2,
          max_tokens: 4096,
          messages: [
            { role: "system", content: "You are a helpful assistant. Respond with valid JSON matching the requested schema." },
            { role: "user", content: input.prompt },
          ],
        })
      );
      const content = res.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("NO_CONTENT_FROM_OPENAI");
      const json = JSON.parse(content);
      return { json, raw: res };
    } catch (e: any) {
      if (e?.status === 429) {
        throw new AIProviderError({ code: "RATE_LIMIT", message: "OpenAI rate limit exceeded" });
      }
      if (e?.status >= 500) {
        throw new AIProviderError({ code: "SERVER", message: "OpenAI server error" });
      }
      throw new AIProviderError({ code: "UNKNOWN", message: e?.message || "OpenAI request failed" });
    }
  }
}