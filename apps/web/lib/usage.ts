import type { PrismaClient } from '@prisma/client';
import { createDevLogger } from './utils/devLogger';

const logger = createDevLogger('usage');

interface MemoryUsage {
  count: number;
  inputTokens: number;
  outputTokens: number;
  estimatedTokens: number;
  generations: number;
}

const mem = {
  users: new Set<string>(),
  usage: new Map<string, Map<string, MemoryUsage>>(),
};

export async function recordGeneration(params: {
  traceId: string;
  userId?: string;
  provider: string;
  type: 'resume' | 'cover_letter';
  status: 'success' | 'error';
  inputChars: number;
  outputChars?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedTokens?: number;
  errorMessage?: string;
  transaction?: PrismaClient;
}) {
  const {
    traceId,
    userId = 'anon',
    provider,
    type,
    status,
    inputChars,
    outputChars = 0,
    inputTokens = 0,
    outputTokens = 0,
    estimatedTokens = 0,
    errorMessage,
    transaction: tx
  } = params;

  // In-memory fallback if no transaction provided
  if (!tx) {
    if (!mem.usage.has(userId)) {
      mem.usage.set(userId, new Map());
    }
    const userUsage = mem.usage.get(userId)!;
    if (!userUsage.has(provider)) {
      userUsage.set(provider, {
        count: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedTokens: 0,
        generations: 0
      });
    }
    const providerUsage = userUsage.get(provider)!;
    providerUsage.generations++;
    providerUsage.inputTokens += inputTokens;
    providerUsage.outputTokens += outputTokens;
    providerUsage.estimatedTokens += estimatedTokens;
    logger.info(`[memory] Recorded ${type} generation for ${userId}/${provider}`);
    return { ok: true, mode: 'memory' as const };
  }

  // Database recording
  try {
    // Ensure user exists
    await tx.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {}
    });

    // Record generation
    await tx.generation.create({
      data: {
        userId,
        traceId,
        provider,
        type,
        status,
        inputChars,
        outputChars,
        inputTokens,
        outputTokens,
        estimatedTokens,
        errorMessage
      }
    });

    // Update usage counter
    if (status === 'success') {
      await tx.usageCounter.upsert({
        where: { 
          userId_provider: { userId, provider }
        },
        create: {
          userId,
          provider,
          generations: 1,
          inputTokens,
          outputTokens,
          estimatedTokens
        },
        update: {
          generations: { increment: 1 },
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
          estimatedTokens: { increment: estimatedTokens }
        }
      });
    }

    logger.info(`[db] Recorded ${type} generation for ${userId}/${provider}`);
    return { ok: true, mode: 'db' as const };
  } catch (error) {
    logger.error('Failed to record generation', error);
    throw error;
  }
}

export function getUserUsage(userId: string = 'anon') {
  // In-memory fallback
  if (!mem.usage.has(userId)) {
    return {
      count: 0,
      limit: 100,
      remaining: 100
    };
  }

  const userUsage = mem.usage.get(userId)!;
  const totalGenerations = Array.from(userUsage.values())
    .reduce((sum, usage) => sum + usage.generations, 0);

  return {
    count: totalGenerations,
    limit: 100,
    remaining: Math.max(0, 100 - totalGenerations)
  };
}

export function hasReachedLimit(userId: string = 'anon'): boolean {
  const { count, limit } = getUserUsage(userId);
  return count >= limit;
}
