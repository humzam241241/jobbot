// Lazy-load to prevent build/startup crashes if the SDK isn't installed
type GoogleGenerativeAIType = any;

export type GoogleCallOpts = {
  modelLabel: string;
  system: string;
  userPayload: string;
  maxOutputTokens?: number;
};

const MODEL_MAP: Record<string, string> = {
  "Gemini 2.5 Pro": "gemini-2.0-pro",
  "Gemini 1.5 Pro": "gemini-1.5-pro",
  "Gemini 1.5 Flash": "gemini-1.5-flash"
};

function resolveModel(label: string) {
  return MODEL_MAP[label] ?? "gemini-1.5-pro";
}

export async function callGoogle({ modelLabel, system, userPayload, maxOutputTokens = 2000 }: GoogleCallOpts) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { ok: false as const, error: { code: "NO_GOOGLE_KEY", message: "GOOGLE_API_KEY missing" } };
  }

  let GoogleGenerativeAI: GoogleGenerativeAIType;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import("@google/generative-ai");
    GoogleGenerativeAI = mod.GoogleGenerativeAI;
  } catch (e) {
    return { ok: false as const, error: { code: "NO_GOOGLE_SDK", message: "@google/generative-ai not installed" } };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: resolveModel(modelLabel), systemInstruction: system });

  try {
    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPayload }]}],
      generationConfig: { maxOutputTokens }
    });

    const txt = resp.response?.text?.() ?? "";
    if (!txt) {
      return { ok: false as const, error: { code: "EMPTY_RESPONSE", message: "Empty Gemini response" } };
    }
    return { ok: true as const, text: txt };
  } catch (err: any) {
    const status = err?.status || err?.response?.status || 500;
    const data = err?.response?.data ?? err?.message ?? String(err);
    return { ok: false as const, error: { code: "GOOGLE_ERROR", status, data } };
  }
}


