import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    database: false,
    ai: false,
    auth: false,
    errors: [] as string[],
  };

  // Database connectivity check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error: any) {
    checks.errors.push(`Database: ${error.message}`);
  }

  // AI providers check
  const hasAnyAIKey = !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENROUTER_API_KEY
  );
  
  if (hasAnyAIKey) {
    checks.ai = true;
  } else {
    checks.errors.push("AI: No provider API keys configured");
  }

  // Auth configuration check
  if (process.env.NEXTAUTH_SECRET && process.env.GOOGLE_CLIENT_ID) {
    checks.auth = true;
  } else {
    checks.errors.push("Auth: Missing NEXTAUTH_SECRET or GOOGLE_CLIENT_ID");
  }

  const isReady = checks.database && checks.ai && checks.auth;

  return NextResponse.json(
    {
      ready: isReady,
      checks,
    },
    { status: isReady ? 200 : 503 }
  );
}
