import { NextResponse } from "next/server";
import { providersHealth } from "@/lib/diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = await providersHealth();
  return NextResponse.json(body, { 
    status: 200, 
    headers: { 
      "Content-Type": "application/json",
      "cache-control": "no-store" 
    }
  });
}
