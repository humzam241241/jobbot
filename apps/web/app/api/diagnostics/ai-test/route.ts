import { NextRequest, NextResponse } from "next/server";
import { generateAny } from "@/lib/ai";
import { hasAnyProvider as anyAIKey } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const j = (data:any, status=200)=> NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });

export async function GET(req: NextRequest) {
  try {
    if (!anyAIKey()) return j({ ok:false, code:"NO_KEYS", message:"No AI API keys configured" }, 400);

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") || "auto";
    const model = searchParams.get("model") || undefined;

    const prompt = "Reply with OK";
    const out = await generateAny(provider, {
      system: "You are a simple test agent.",
      user: prompt,
      model
    });

    return j({ ok:true, tried: out.providerTried, usage: out.usage, text: out.text?.slice(0,200) });
  } catch (e:any) {
    return j({ ok:false, code:"AI_TEST_FAILED", message: String(e?.message||e), stack: (e?.stack||"").split('\n').slice(0,3).join('\n') }, 400);
  }
}


