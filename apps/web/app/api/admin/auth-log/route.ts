import { NextResponse } from "next/server";

export async function GET() {
  // AuthLog model does not exist in the Prisma schema; return empty list.
  return NextResponse.json({ ok: true, logs: [] });
}
