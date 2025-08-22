// apps/web/lib/usage/counter.ts
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createDevLogger } from '../utils/devLogger';
import { prisma } from '../db';

const logger = createDevLogger('usage:counter');

// Default usage limit per user
const DEFAULT_USAGE_LIMIT = 24;

// In-memory storage for usage tracking (in production, this would be a database)
const usageStore: Record<string, { count: number; limit: number; lastUpdated: Date }> = {};

/**
 * Get or create a user ID from cookies
 * @returns User ID
 */
function getUserId(): string {
  const cookieStore = cookies();
  let userId = cookieStore.get('userId')?.value;
  
  if (!userId) {
    userId = uuidv4();
    // In a real app, you'd set the cookie with an appropriate expiration
    // Since we can't modify cookies in a server function, we'll just log this
    logger.info(`New user created: ${userId}`);
  }
  
  return userId;
}

/**
 * Get usage information for the current user
 * @returns Usage information
 */
export function getUserUsage(): { count: number; limit: number; remaining: number } {
  const userId = getUserId();
  
  if (!usageStore[userId]) {
    usageStore[userId] = {
      count: 0,
      limit: DEFAULT_USAGE_LIMIT,
      lastUpdated: new Date()
    };
  }
  
  const { count, limit } = usageStore[userId];
  const remaining = Math.max(0, limit - count);
  
  return { count, limit, remaining };
}

/**
 * Increment usage for the current user
 * @param what What was used
 * @param transaction Optional transaction for database operations
 * @returns Updated usage information
 */
export async function incrementUsage(
  what: string, 
  transaction?: any
): Promise<{ count: number; limit: number; remaining: number }> {
  const userId = getUserId();
  
  if (!usageStore[userId]) {
    usageStore[userId] = {
      count: 0,
      limit: DEFAULT_USAGE_LIMIT,
      lastUpdated: new Date()
    };
  }
  
  usageStore[userId].count += 1;
  usageStore[userId].lastUpdated = new Date();
  
  const { count, limit } = usageStore[userId];
  const remaining = Math.max(0, limit - count);
  
  logger.info(`Usage incremented for ${userId}: ${what}, count=${count}, remaining=${remaining}`);
  
  // If we have a transaction, update the database usage counter
  if (transaction) {
    try {
      // Update or create usage counter in database
      await transaction.usageCounter.upsert({
        where: { userId },
        update: {
          generations: { increment: 1 },
          updatedAt: new Date()
        },
        create: {
          userId,
          generations: 1,
          inputTokens: 0,
          outputTokens: 0,
          estimatedTokens: 0,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update usage counter in database', error);
    }
  }
  
  return { count, limit, remaining };
}

/**
 * Record a generation in the database
 * @param options Generation details
 */
export async function recordGeneration({
  traceId,
  provider,
  type,
  status,
  inputChars,
  outputChars,
  inputTokens,
  outputTokens,
  estimatedTokens,
  errorMessage,
  transaction
}: {
  traceId: string;
  provider: string;
  type: 'resume' | 'cover_letter' | 'ats_report';
  status: 'success' | 'error';
  inputChars: number;
  outputChars?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedTokens?: number;
  errorMessage?: string;
  transaction: any;
}): Promise<void> {
  const userId = getUserId();
  
  try {
    // Create generation record
    await transaction.generation.create({
      data: {
        userId,
        traceId,
        provider,
        type,
        status,
        inputChars,
        outputChars: outputChars || 0,
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        estimatedTokens: estimatedTokens || 0,
        errorMessage,
        createdAt: new Date()
      }
    });
    
    // If successful and we have token usage, update the usage counter
    if (status === 'success' && (inputTokens || outputTokens || estimatedTokens)) {
      await transaction.usageCounter.upsert({
        where: { userId_provider: { userId, provider } },
        update: {
          inputTokens: { increment: inputTokens || 0 },
          outputTokens: { increment: outputTokens || 0 },
          estimatedTokens: { increment: estimatedTokens || 0 },
          updatedAt: new Date()
        },
        create: {
          userId,
          provider,
          inputTokens: inputTokens || 0,
          outputTokens: outputTokens || 0,
          estimatedTokens: estimatedTokens || 0,
          generations: 1,
          updatedAt: new Date()
        }
      });
    }
  } catch (error) {
    logger.error(`Failed to record generation: ${traceId}`, error);
  }
}

/**
 * Check if the user has reached their usage limit
 * @returns Whether the user has reached their limit
 */
export function hasReachedLimit(): boolean {
  const { count, limit } = getUserUsage();
  return count >= limit;
}

/**
 * Reset usage for the current user
 * @returns Updated usage information
 */
export function resetUsage(): { count: number; limit: number; remaining: number } {
  const userId = getUserId();
  
  if (usageStore[userId]) {
    usageStore[userId].count = 0;
    usageStore[userId].lastUpdated = new Date();
  } else {
    usageStore[userId] = {
      count: 0,
      limit: DEFAULT_USAGE_LIMIT,
      lastUpdated: new Date()
    };
  }
  
  const { count, limit } = usageStore[userId];
  const remaining = limit - count;
  
  logger.info(`Usage reset for ${userId}: count=${count}, remaining=${remaining}`);
  
  return { count, limit, remaining };
}

/**
 * Get total usage across all users (for admin purposes)
 * @returns Total usage information
 */
export function getTotalUsage(): { users: number; totalCount: number } {
  const users = Object.keys(usageStore).length;
  const totalCount = Object.values(usageStore).reduce((sum, user) => sum + user.count, 0);
  
  return { users, totalCount };
}