import { setTimeout as delay } from "node:timers/promises";

type Msg = { role: "system"|"user"|"assistant"; content: string };
type GenOpts = {
  purpose: "resume"|"coverLetter"|"jdParsing"|string;
  messages: Msg[];
  temperature?: number;
  maxTokens?: number;
  providersOverride?: string[];
  modelOverride?: string;
};

const ORDER = (process.env.LLM_PROVIDER_ORDER ?? "gemini,openai,anthropic")
  .split(",").map(s => s.trim()).filter(Boolean);

const jitter = (n:number) => Math.floor(n + Math.random()*n);

export async function generate(opts: GenOpts) {
  const order = opts.providersOverride?.length ? opts.providersOverride : ORDER;
  const attempts: {provider:string; ok:boolean; error?:string; model?:string}[] = [];

  for (const provider of order) {
    for (let attempt=0; attempt<2; attempt++) {
      try {
        const { text, modelUsed } = await callProvider(provider, opts);
        attempts.push({ provider, ok:true, model:modelUsed });
        return { text, providerUsed: provider, modelUsed };
      } catch (e:any) {
        const msg = String(e?.message ?? e);
        attempts.push({ provider, ok:false, error: msg });
        // fallback on 429/5xx/quota keywords
        if (/(429|rate|quota|limit|overloaded|5\d\d|insufficient|unavailable)/i.test(msg)) {
          await delay(jitter(250));
          continue; // retry same provider once
        }
        break; // other errors → try next provider
      }
    }
    await delay(jitter(350));
  }
  const last = attempts[attempts.length-1];
  const summary = attempts.map(a => `${a.provider}:${a.ok?'OK':'FAIL'}`).join(" → ");
  throw new Error(`All providers failed. Attempts: ${summary}. Last: ${last?.error ?? 'unknown'}`);
}

async function callProvider(provider: string, opts: GenOpts): Promise<{text:string; modelUsed:string}> {
  switch (provider) {
    case "gemini": return (await import("./providers/gemini")).callGemini(opts);
    case "openai": return (await import("./providers/openai")).callOpenAI(opts);
    case "anthropic": return (await import("./providers/anthropic")).callAnthropic(opts);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
