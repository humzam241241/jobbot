import Anthropic from "@anthropic-ai/sdk";
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { SYSTEM_PROMPT, buildUserPrompt } from "./sharedPrompts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function anthropicRewrite(args: { 
  model?: string; 
  jobDescription: string; 
  resumeMarkdown: string; 
  temperature?: number; 
  maxTokens?: number; 
}) {
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