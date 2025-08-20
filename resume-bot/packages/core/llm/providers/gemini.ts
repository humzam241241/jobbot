import type { GenOpts } from "../LLMRouter";

export async function callGemini(opts: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  
  try {
    // Dynamically import the Google Generative AI library
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    
    const modelName = opts.modelOverride ?? 
                      (opts.purpose === "resume" ? process.env.MODEL_RESUME : null) ?? 
                      "gemini-2.5-pro" ?? 
                      "gemini-1.5-pro";
    
    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({ model: modelName });

    const prompt = opts.messages.map((m:any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    
    const res = await model.generateContent({ 
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 2048,
      }
    });
    
    const text = res.response?.text?.() ?? 
                res.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                
    if (!text) throw new Error("Gemini returned empty text");
    return { text, modelUsed: modelName };
  } catch (error: any) {
    // Enhance error message for better diagnostics
    if (error.message?.includes("429")) {
      throw new Error(`Gemini quota exceeded or rate limited: ${error.message}`);
    }
    throw error;
  }
}
