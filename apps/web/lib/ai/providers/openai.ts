import OpenAI from "openai";
import { forceJsonPrompt, extractFirstJsonObject, repairWithProvider } from "../utils/json";
import { tailorResponseSchema, TailorResponseT } from "@/lib/schemas/resume";
import { resolveModel } from "../resolveModel";

type Args = { apiKey: string; model?: string; prompt: string; schemaText: string };

export async function openaiTailorResume({ apiKey, model, prompt, schemaText }: Args): Promise<TailorResponseT> {
  const openai = new OpenAI({ apiKey });
  const finalModel = resolveModel("openai", model);

  const doCall = async (p: string) => {
    try {
      const r = await openai.chat.completions.create({
        model: finalModel,
        messages: [{ role: "user", content: p }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4000,
      });
      return r.choices[0]?.message?.content ?? "";
    } catch (err: any) {
      // Map OpenAI errors to our error types
      if (err.status === 429 || /rate.*limit|quota/i.test(err.message)) {
        const e: any = new Error('RATE_LIMIT');
        e.code = 'RATE_LIMIT';
        e.status = 429;
        e.retryAfter = Number(err.headers?.['retry-after']) || 60;
        throw e;
      }

      if (err.status === 404 && /model.*not.*exist/i.test(err.message)) {
        const e: any = new Error('MODEL_NOT_FOUND');
        e.code = 'MODEL_NOT_FOUND';
        e.hint = `Model "${model}" not found. Using "${finalModel}" for OpenAI.`;
        throw e;
      }

      throw err;
    }
  };

  const text = await doCall(forceJsonPrompt(prompt, schemaText));
  let json = extractFirstJsonObject(text);

  try { 
    return tailorResponseSchema.parse(json); 
  } catch (e) {
    const fixed = await repairWithProvider<TailorResponseT>("openai", doCall, json, e as any);
    return tailorResponseSchema.parse(fixed);
  }
}