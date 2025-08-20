import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const API_BASE = process.env.API_BASE || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
  const FORCE_UPSTREAM = (process.env.FORCE_UPSTREAM || "").toLowerCase() === "true";
  return NextResponse.json({
    ok:true,
    mode: API_BASE ? (FORCE_UPSTREAM ? "upstream-only" : "upstream+fallback") : "local-only",
    apiBase: API_BASE || null
  }, { headers:{ "cache-control":"no-store" }});
}
