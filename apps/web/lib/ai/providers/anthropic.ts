import Anthropic from "@anthropic-ai/sdk";
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { SYSTEM_PROMPT, buildUserPrompt } from "./sharedPrompts";
import { Provider, GenInput, GenResult, AIProviderError } from "./types";

export async function anthropicRewrite(args: {
  model?: string;
  jobDescription: string;
  resumeMarkdown: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const model = args.model ?? "claude-3-5-sonnet-20240620";
  try {
    const res = await withBackoff(() =>
      client.messages.create({
        model,
        max_tokens: args.maxTokens ?? 1200,
        temperature: args.temperature ?? 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(args.jobDescription, args.resumeMarkdown) }],
      })
    );
    const content = res.content?.[0]?.type === "text" ? res.content[0].text : "";
    if (!content) throw new Error("NO_CONTENT_FROM_ANTHROPIC");
    return { ok: true as const, content, modelUsed: model, providerUsed: "anthropic" };
  } catch (e: any) {
    return {
      ok: false as const,
      error: {
        code: String(e?.status ?? e?.code ?? "ANTHROPIC_ERROR"),
        message: "Anthropic request failed.",
        raw: e
      }
    };
  }
}

export class AnthropicProvider implements Provider {
  name = "anthropic" as const;

  available(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  async generate(input: GenInput): Promise<GenResult> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const model = input.model ?? "claude-3-5-sonnet-20240620";
    try {
      const res = await withBackoff(() =>
        client.messages.create({
          model,
          max_tokens: 4096,
          temperature: input.temperature ?? 0.2,
          system: "You are a helpful assistant. Respond with valid JSON matching the requested schema.",
          messages: [{ role: "user", content: input.prompt }],
        })
      );
      const content = res.content?.[0]?.type === "text" ? res.content[0].text : "";
      if (!content) throw new Error("NO_CONTENT_FROM_ANTHROPIC");
      const json = JSON.parse(content);
      return { json, raw: res };
    } catch (e: any) {
      if (e?.status === 429) {
        throw new AIProviderError({ code: "RATE_LIMIT", message: "Anthropic rate limit exceeded" });
      }
      if (e?.status >= 500) {
        throw new AIProviderError({ code: "SERVER", message: "Anthropic server error" });
      }
      throw new AIProviderError({ code: "UNKNOWN", message: e?.message || "Anthropic request failed" });
    }
  }
}