// apps/web/lib/usage/counter.ts
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createDevLogger } from '../utils/devLogger';

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
 * @returns Updated usage information
 */
export async function incrementUsage(what: string): Promise<{ count: number; limit: number; remaining: number }> {
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
  
  return { count, limit, remaining };
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