import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const uptime = process.uptime();
  
  // Check which AI provider keys are available
  const hasKeys = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    gemini: !!process.env.GOOGLE_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };

  return NextResponse.json({
    ok: true,
    uptime: Math.round(uptime),
    hasKeys,
  });
}
