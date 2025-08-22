import type { PrismaClient } from '@prisma/client';
import { createDevLogger } from './utils/devLogger';

const logger = createDevLogger('usage');

interface MemoryUsage {
  count: number;
  inputTokens: number;
  outputTokens: number;
  estimatedTokens: number;
  generations: number;
  lastReset: number; // timestamp of last reset
}

const mem = {
  users: new Set<string>(),
  usage: new Map<string, Map<string, MemoryUsage>>(),
};

// Reset period and limits
const RESET_PERIOD_MS = 1000 * 60 * 60; // 1 hour
const DEFAULT_LIMIT = process.env.NODE_ENV === 'development' ? 1000 : 100;
const PROVIDER_LIMITS: Record<string, number> = {
  google: DEFAULT_LIMIT,
  openai: DEFAULT_LIMIT,
  anthropic: DEFAULT_LIMIT,
};

function getDefaultUsage(): MemoryUsage {
  return {
    count: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedTokens: 0,
    generations: 0,
    lastReset: Date.now(),
  };
}

function shouldResetUsage(usage: MemoryUsage): boolean {
  return Date.now() - usage.lastReset > RESET_PERIOD_MS;
}

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
    
    // Initialize or reset provider usage if needed
    if (!userUsage.has(provider) || shouldResetUsage(userUsage.get(provider)!)) {
      userUsage.set(provider, getDefaultUsage());
    }

    const providerUsage = userUsage.get(provider)!;
    if (status === 'success') {
      providerUsage.generations++;
      providerUsage.inputTokens += inputTokens;
      providerUsage.outputTokens += outputTokens;
      providerUsage.estimatedTokens += estimatedTokens;
    }
    logger.info(`[memory] Recorded ${type} generation for ${userId}/${provider}`);
    return { ok: true, mode: 'memory' as const };
  }

  // Database recording (keep existing code)
  try {
    await tx.user.upsert({
      where: { id: userId },
      create: { id: userId },
      update: {}
    });

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

export function getUserUsage(userId: string = 'anon', provider?: string) {
  // Skip limits in development
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_LIMITS === '1') {
    return {
      count: 0,
      limit: DEFAULT_LIMIT,
      remaining: DEFAULT_LIMIT
    };
  }

  // In-memory fallback
  if (!mem.usage.has(userId)) {
    return {
      count: 0,
      limit: DEFAULT_LIMIT,
      remaining: DEFAULT_LIMIT
    };
  }

  const userUsage = mem.usage.get(userId)!;
  
  // If provider specified, check only that provider
  if (provider) {
    const usage = userUsage.get(provider);
    if (!usage || shouldResetUsage(usage)) {
      return {
        count: 0,
        limit: PROVIDER_LIMITS[provider] || DEFAULT_LIMIT,
        remaining: PROVIDER_LIMITS[provider] || DEFAULT_LIMIT
      };
    }
    const limit = PROVIDER_LIMITS[provider] || DEFAULT_LIMIT;
    return {
      count: usage.generations,
      limit,
      remaining: Math.max(0, limit - usage.generations)
    };
  }

  // Otherwise sum across all providers
  let totalGenerations = 0;
  for (const [provider, usage] of userUsage.entries()) {
    if (!shouldResetUsage(usage)) {
      totalGenerations += usage.generations;
    } else {
      userUsage.set(provider, getDefaultUsage());
    }
  }

  return {
    count: totalGenerations,
    limit: DEFAULT_LIMIT,
    remaining: Math.max(0, DEFAULT_LIMIT - totalGenerations)
  };
}

export function hasReachedLimit(userId: string = 'anon', provider?: string): boolean {
  // Skip limits in development
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_LIMITS === '1') {
    return false;
  }

  const { count, limit } = getUserUsage(userId, provider);
  return count >= limit;
}