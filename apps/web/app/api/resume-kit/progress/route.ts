import { NextRequest, NextResponse } from "next/server";
import { getProgress } from "@/lib/progressStore";
export const runtime = "nodejs";
export async function GET(req: NextRequest){
  const key = new URL(req.url).searchParams.get("key") || "";
  return NextResponse.json({ ok:true, progress: getProgress(key) });
}
