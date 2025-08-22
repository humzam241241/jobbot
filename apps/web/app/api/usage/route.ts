// apps/web/app/api/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserUsage } from "@/lib/usage/counter";

export const dynamic = "force-dynamic";

/**
 * API route that returns the current user's usage information
 */
export async function GET(req: NextRequest) {
  const usage = getUserUsage();
  
  return NextResponse.json({
    ok: true,
    usage: {
      count: usage.count,
      limit: usage.limit,
      remaining: usage.remaining
    }
  });
}
