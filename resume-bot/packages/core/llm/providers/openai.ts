import type { GenOpts } from "../LLMRouter";

export async function callOpenAI(opts: any) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  
  try {
    // Dynamically import OpenAI
    const { default: OpenAI } = await import("openai");
    
    const client = new OpenAI({ apiKey: key });
    
    const model = opts.modelOverride ?? 
                 (opts.purpose === "resume" ? process.env.MODEL_RESUME : null) ?? 
                 (opts.purpose === "coverLetter" ? process.env.MODEL_COVER_LETTER : null) ?? 
                 "gpt-4o-mini";
    
    const res = await client.chat.completions.create({
      model,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 2048,
      messages: opts.messages,
    });
    
    const text = res.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("OpenAI returned empty text");
    
    return { text, modelUsed: model };
  } catch (error: any) {
    // Enhance error message for better diagnostics
    if (error.status === 429 || error.message?.includes("quota")) {
      throw new Error(`OpenAI quota exceeded or rate limited: ${error.message}`);
    }
    throw error;
  }
}
