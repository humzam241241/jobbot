import { callGoogle } from "./google";

export type LlmCallInput = {
  provider: "Google" | "OpenAI" | "Anthropic";
  modelLabel: string;
  system: string;
  userPayload: string;
  maxOutputTokens?: number;
};

async function wait(ms: number) { return new Promise(res => setTimeout(res, ms)); }

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delay = 500): Promise<T> {
  let lastErr: any;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts) await wait(delay * (i + 1));
    }
  }
  throw lastErr;
}

export async function callWithFallback(input: LlmCallInput) {
  const order = [input.provider, "OpenAI", "Anthropic"].filter((p, i, arr) => arr.indexOf(p) === i);

  const errors: any[] = [];
  for (const p of order) {
    if (p === "Google") {
      const r = await withRetry(() => callGoogle({ modelLabel: input.modelLabel, system: input.system, userPayload: input.userPayload, maxOutputTokens: input.maxOutputTokens }));
      if ((r as any).ok) return { ok: true as const, text: (r as any).text, provider: p };
      errors.push({ provider: p, error: (r as any).error });
      continue;
    }
    // TODO: Plug in OpenAI / Anthropic adapters when available
  }
  return { ok: false as const, errors };
}



