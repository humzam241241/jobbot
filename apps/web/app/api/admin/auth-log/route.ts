import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export async function GET() {
  const logs = await prisma.authLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ ok:true, logs });
}
