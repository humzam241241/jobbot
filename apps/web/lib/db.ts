// apps/web/lib/db.ts
import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;

const validPgUrl = (url?: string) => !!url && /^postgres(ql)?:\/\//i.test(url);

/** Returns a Prisma client or null (safe "no-DB" mode) */
export function getDbOrNull(): PrismaClient | null {
  if (process.env.SKIP_DB === '1') return null;
  const url = process.env.DATABASE_URL;
  if (!validPgUrl(url)) {
    console.warn('[db] Invalid DATABASE_URL; running in no-DB mode');
    return null;
  }
  if (!prismaInstance) prismaInstance = new PrismaClient();
  return prismaInstance;
}

/** Back-compat exports without colliding with the internal variable name */
export const prismaClient = getDbOrNull();
/** Optional alias for existing imports */
export const prisma = prismaClient;
/** Handy flag if you want to branch logic */
export const hasDb = !!prismaClient;