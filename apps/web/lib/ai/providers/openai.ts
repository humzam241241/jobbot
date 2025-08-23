import OpenAI from "openai";
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { SYSTEM_PROMPT, buildUserPrompt } from "./sharedPrompts";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function openaiRewrite(args: { 
  model?: string; 
  jobDescription: string; 
  resumeMarkdown: string; 
  temperature?: number; 
  maxTokens?: number; 
}) {
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