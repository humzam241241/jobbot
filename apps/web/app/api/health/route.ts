import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint for server monitoring
 * Returns basic system health and environment variable presence (not values)
 */
export async function GET() {
  const uptime = process.uptime();
  
  // Check environment variables (only presence, not values)
  const env = {
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    STORAGE_PROVIDER: !!process.env.STORAGE_PROVIDER,
    STORAGE_BUCKET: !!process.env.STORAGE_BUCKET,
    STORAGE_BASE_URL: !!process.env.STORAGE_BASE_URL,
    RESUME_PDF_ENGINE: !!process.env.RESUME_PDF_ENGINE,
  };

  // System info
  const systemInfo = {
    uptime: Math.round(uptime),
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }
  };

  return NextResponse.json({
    ok: true,
    env,
    system: systemInfo,
    timestamp: new Date().toISOString(),
  });
}