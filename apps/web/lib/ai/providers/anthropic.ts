import Anthropic from "@anthropic-ai/sdk";
import { forceJsonPrompt, extractFirstJsonObject, repairWithProvider } from "../utils/json";
import { tailorResponseSchema, TailorResponseT } from "@/lib/schemas/resume";
import { resolveModel } from "../resolveModel";

type Args = { apiKey: string; model?: string; prompt: string; schemaText: string };

export async function anthropicTailorResume({ apiKey, model, prompt, schemaText }: Args): Promise<TailorResponseT> {
  const anthropic = new Anthropic({ apiKey });
  const finalModel = resolveModel("anthropic", model);

  const doCall = async (p: string) => {
    try {
      const msg = await anthropic.messages.create({
        model: finalModel,
      max_tokens: 4000,
        temperature: 0.2,
        system: "You are a strict JSON generator. Output only valid JSON, no commentary.",
        messages: [{ role: "user", content: p }],
      });
      
      // Claude returns content blocks; we want the text
      const text = msg.content?.map(c => (c.type === "text" ? c.text : "")).join("") ?? "";
      return text;
    } catch (err: any) {
      // Map Anthropic errors to our error types
      const msg = String(err?.message || err);
      const status = err?.status;

      if (status === 429 || /rate.*limit|quota/i.test(msg)) {
        const e: any = new Error('RATE_LIMIT');
        e.code = 'RATE_LIMIT';
        e.status = 429;
        e.retryAfter = Number(err.headers?.['retry-after']) || 60;
        throw e;
      }

      if (status === 404 || /model.*not.*found/i.test(msg)) {
        const e: any = new Error('MODEL_NOT_FOUND');
        e.code = 'MODEL_NOT_FOUND';
        e.hint = `Model "${model}" not found. Using "${finalModel}" for Anthropic.`;
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
    const fixed = await repairWithProvider<TailorResponseT>("anthropic", doCall, json, e as any);
    return tailorResponseSchema.parse(fixed);
  }
}