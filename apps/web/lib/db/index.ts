import { PrismaClient } from '@prisma/client';

export const DB_ENABLED = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "");

let prisma: PrismaClient | null = null;

if (DB_ENABLED) {
  prisma = new PrismaClient();
}

export { prisma };
