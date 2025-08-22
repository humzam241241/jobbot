import { GoogleGenerativeAI } from "@google/generative-ai";
import { forceJsonPrompt, extractFirstJsonObject, repairWithProvider } from "../utils/json";
import { tailorResponseSchema, TailorResponseT } from "@/lib/schemas/resume";
import { resolveModel } from "../resolveModel";

type Args = { apiKey: string; model?: string; prompt: string; schemaText: string };

export async function googleTailorResume({ apiKey, model, prompt, schemaText }: Args): Promise<TailorResponseT> {
  const client = new GoogleGenerativeAI(apiKey);
  const finalModel = resolveModel("google", model);

  const doCall = async (p: string) => {
    try {
      const r = await client.generateContent({
        model: finalModel,
        contents: [{ role: "user", parts: [{ text: p }]}],
        generationConfig: {
          temperature: 0.2,
          candidateCount: 1,
          stopSequences: ["}"],
          maxOutputTokens: 4000,
        }
      });

      if (!r.response.ok) {
        throw new Error(r.response.text());
      }

      return r.response.text();
    } catch (err: any) {
      // Map Google errors to our error types
      const msg = String(err?.message || err);
      
      if (msg.includes('quota') || msg.includes('rate limit')) {
        const e: any = new Error('RATE_LIMIT');
        e.code = 'RATE_LIMIT';
        e.status = 429;
        throw e;
      }

      if (msg.includes('model not found') || msg.includes('does not exist')) {
        const e: any = new Error('MODEL_NOT_FOUND');
        e.code = 'MODEL_NOT_FOUND';
        e.hint = `Model "${model}" not found. Using "${finalModel}" for Google.`;
        throw e;
      }

      throw err;
    }
  };

  // Add strong JSON hints to the prompt
  const jsonPrompt = [
    prompt,
    "\nYou MUST return a valid JSON object with this exact structure:",
    schemaText,
    "\nReturn ONLY the JSON object. No markdown fences, no commentary.",
    "\nEnsure all required fields are present and non-null.",
  ].join("\n");

  const text = await doCall(jsonPrompt);
  let json = extractFirstJsonObject(text);

  try { 
    return tailorResponseSchema.parse(json); 
  } catch (e) {
    const fixed = await repairWithProvider<TailorResponseT>("google", doCall, json, e as any);
    return tailorResponseSchema.parse(fixed);
  }
}