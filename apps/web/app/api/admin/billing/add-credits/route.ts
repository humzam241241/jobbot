import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Provider as PrismaProvider } from "@prisma/client";

const prisma = new PrismaClient();

async function requireAdmin(req: NextRequest) {
  // TODO: replace with real auth/role check
  // For now, this is a placeholder - implement proper admin authentication
  // Throw if not admin
  return true;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { userId, provider, cents, tokens, note } = await req.json();

    // Basic validation
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    
    if (!provider || !["openai", "anthropic", "openrouter", "google"].includes(provider)) {
      return NextResponse.json({ error: "valid provider required" }, { status: 400 });
    }

    const centsNum = Number.isFinite(cents) ? Math.floor(Number(cents)) : 0;
    const tokensNum = Number.isFinite(tokens) ? Math.floor(Number(tokens)) : 0;
    
    if (centsNum <= 0 && tokensNum <= 0) {
      return NextResponse.json({ error: "cents or tokens must be > 0" }, { status: 400 });
    }

    // Ensure balance row exists & increment
    await prisma.userProviderBalance.upsert({
      where: { userId_provider: { userId, provider: provider as PrismaProvider } },
      create: { userId, provider: provider as PrismaProvider, cents: centsNum, tokens: tokensNum },
      update: { cents: { increment: centsNum }, tokens: { increment: tokensNum } }
    });

    // Audit purchase row
    await prisma.purchase.create({
      data: {
        userId,
        provider: provider as PrismaProvider,
        cents: centsNum,
        tokens: tokensNum,
        note: note ?? "admin top-up"
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("Add credits error:", e);
    return NextResponse.json({ 
      error: "ADD_CREDITS_FAILED", 
      detail: e?.message ?? String(e) 
    }, { status: 500 });
  }
}
