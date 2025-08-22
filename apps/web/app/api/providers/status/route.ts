// apps/web/app/api/providers/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAvailableProviders } from "@/lib/llm/providers";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * API route that returns the status of available AI providers
 */
export async function GET(req: NextRequest) {
  const providers = getAvailableProviders();
  
  return NextResponse.json({
    providers: {
      openai: {
        available: env.hasOpenAI,
        models: providers.openai.models
      },
      anthropic: {
        available: env.hasAnthropic,
        models: providers.anthropic.models
      },
      google: {
        available: env.hasGoogle,
        models: providers.gemini.models
      }
    },
    anyProviderAvailable: env.hasOpenAI || env.hasAnthropic || env.hasGoogle
  });
}