// apps/web/app/api/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserUsage } from "@/lib/usage/counter";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * API route that returns usage information for the current user
 */
export async function GET(req: NextRequest) {
  // Get user ID from cookies
  const cookieStore = cookies();
  const userId = cookieStore.get("userId")?.value;
  
  if (!userId) {
    return NextResponse.json({
      count: 0,
      limit: 24,
      remaining: 24
    });
  }
  
  // Get in-memory usage data
  const memoryUsage = getUserUsage();
  
  try {
    // Get database usage data if available
    const dbUsage = await prisma.usageCounter.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });
    
    // Get recent generations
    const recentGenerations = await prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    
    // Calculate token usage by provider
    const tokenUsageByProvider = dbUsage.reduce((acc, counter) => {
      acc[counter.provider] = {
        inputTokens: counter.inputTokens,
        outputTokens: counter.outputTokens,
        estimatedTokens: counter.estimatedTokens,
        generations: counter.generations
      };
      return acc;
    }, {} as Record<string, any>);
    
    // Get most recent provider
    const mostRecentProvider = recentGenerations[0]?.provider || "auto";
    
    return NextResponse.json({
      ...memoryUsage,
      provider: mostRecentProvider,
      providerUsage: tokenUsageByProvider,
      recentGenerations: recentGenerations.map(g => ({
        id: g.id,
        provider: g.provider,
        type: g.type,
        status: g.status,
        createdAt: g.createdAt,
        inputTokens: g.inputTokens,
        outputTokens: g.outputTokens,
        estimatedTokens: g.estimatedTokens
      }))
    });
  } catch (error) {
    console.error("Error fetching usage data:", error);
    
    // Fall back to in-memory usage if database query fails
    return NextResponse.json(memoryUsage);
  }
}