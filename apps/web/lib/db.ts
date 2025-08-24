import { PrismaClient } from '@prisma/client';
import { debugLogger } from './utils/debug-logger';
import type { User, ResumeKit, MockDb } from '@/types/db';

declare global {
  var prisma: PrismaClient | undefined;
}

// Determine if DB should be used
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL);
const isDbEnabled = process.env.SKIP_DB !== '1' && hasValidDatabaseUrl;

// Mock database for development
const mockDb: MockDb = {
  users: [
    {
      id: 'mock-user',
      email: 'user@example.com',
      name: 'Test User',
      credits: 30,
      maxCredits: 30
    }
  ],
  resumeKits: []
};

// Initialize Prisma Client only when DB is enabled
export const prisma = isDbEnabled
  ? (global.prisma || new PrismaClient())
  : undefined;

if (process.env.NODE_ENV !== 'production') {
  (global as any).prisma = prisma;
}

// Mock functions for development
export const getMockUser = (id: string): User => {
  return mockDb.users.find(u => u.id === id) || mockDb.users[0];
};

export const getMockResumeKit = (id: string): ResumeKit | undefined => {
  return mockDb.resumeKits.find(k => k.id === id);
};

export const createMockResumeKit = (data: Partial<ResumeKit>): ResumeKit => {
  const kit: ResumeKit = {
    id: `mock-${Date.now()}`,
    userId: data.userId!,
    status: data.status || 'pending',
    originalResume: data.originalResume || '',
    jobDescription: data.jobDescription || '',
    tailoredResume: data.tailoredResume,
    coverLetter: data.coverLetter,
    atsReport: data.atsReport,
    error: data.error,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockDb.resumeKits.push(kit);
  return kit;
};

export const updateMockResumeKit = (id: string, data: Partial<ResumeKit>): ResumeKit | null => {
  const index = mockDb.resumeKits.findIndex(k => k.id === id);
  if (index === -1) return null;
  
  mockDb.resumeKits[index] = {
    ...mockDb.resumeKits[index],
    ...data,
    updatedAt: new Date()
  };
  return mockDb.resumeKits[index];
};

// Log database mode
debugLogger.info('Database mode', {
  mode: isDbEnabled ? 'prisma' : 'mock',
  url: process.env.DATABASE_URL || '(unset)',
  skipDb: process.env.SKIP_DB
});
debugLogger.info('Database mode', {
  mode: isDbEnabled ? 'prisma' : 'mock',
  url: process.env.DATABASE_URL || '(unset)',
  skipDb: process.env.SKIP_DB
});