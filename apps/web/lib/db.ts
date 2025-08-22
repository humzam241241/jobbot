import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

function validPgUrl(url?: string) {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

/** Returns a Prisma client or null (in-memory fallback mode) */
export function getDbOrNull() {
  if (process.env.SKIP_DB === '1') return null;
  const url = process.env.DATABASE_URL;
  if (!validPgUrl(url)) {
    console.warn('[db] Invalid DATABASE_URL format - running in no-DB mode');
    return null;
  }
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

// For backwards compatibility
export const prisma = getDbOrNull();