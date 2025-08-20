import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Provider as PrismaProvider } from "@prisma/client";

const prisma = new PrismaClient();

async function requireAdmin(req: NextRequest) {
  // TODO: replace with real auth/role check
  // For now, this is a placeholder - implement proper admin authentication
  // Throw if not admin
  return true;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
    }

    // Get current balances for all providers
    const balances = await prisma.userProviderBalance.findMany({
      where: { userId },
    });

    // Transform balances into a more usable format
    const balancesByProvider = balances.reduce((acc, balance) => {
      acc[balance.provider.toLowerCase()] = {
        cents: balance.cents,
        tokens: balance.tokens
      };
      return acc;
    }, {} as Record<string, { cents: number; tokens: number }>);

    // Ensure all providers are represented (even with 0 balance)
    const providers = ['openai', 'anthropic', 'openrouter', 'google'];
    providers.forEach(provider => {
      if (!balancesByProvider[provider]) {
        balancesByProvider[provider] = { cents: 0, tokens: 0 };
      }
    });

    // Get usage stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageEvents = await prisma.aiUsage.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Aggregate usage by provider
    const usageByProvider = usageEvents.reduce((acc, usage) => {
      const provider = usage.provider.toLowerCase();
      if (!acc[provider]) {
        acc[provider] = { calls: 0, inTok: 0, outTok: 0, cents: 0 };
      }
      acc[provider].calls += 1;
      acc[provider].inTok += usage.inputTokens || 0;
      acc[provider].outTok += usage.outputTokens || 0;
      acc[provider].cents += usage.cents || 0;
      return acc;
    }, {} as Record<string, { calls: number; inTok: number; outTok: number; cents: number }>);

    // Ensure all providers are represented in usage
    providers.forEach(provider => {
      if (!usageByProvider[provider]) {
        usageByProvider[provider] = { calls: 0, inTok: 0, outTok: 0, cents: 0 };
      }
    });

    // Get recent events (last 20)
    const recent = await prisma.aiUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cents: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      balances: balancesByProvider,
      usage: usageByProvider,
      recent
    }, { status: 200 });

  } catch (e: any) {
    console.error("Billing summary error:", e);
    return NextResponse.json({ 
      error: "BILLING_SUMMARY_FAILED", 
      detail: e?.message ?? String(e) 
    }, { status: 500 });
  }
}
