import { NextRequest, NextResponse } from "next/server";
import { getUserUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const usage = getUserUsage();
  return NextResponse.json({ usage });
}