import { Prisma, PrismaClient } from '@prisma/client';

declare global {
  namespace PrismaJson {
    type UserUpdateInput = Prisma.UserUpdateInput & {
      credits?: number;
      maxCredits?: number;
    };

    type UserSelect = Prisma.UserSelect & {
      credits?: boolean;
      maxCredits?: boolean;
    };

    type ResumeKit = {
      id: string;
      userId: string;
      status: string;
      originalResume: string;
      jobDescription: string;
      tailoredResume?: string;
      coverLetter?: string;
      atsReport?: string;
      error?: string;
      createdAt: Date;
      updatedAt: Date;
    };

    type ResumeKitCreateInput = Omit<ResumeKit, 'id' | 'createdAt' | 'updatedAt'>;
    type ResumeKitUpdateInput = Partial<ResumeKitCreateInput>;
  }

  interface PrismaClient {
    resumeKit: {
      create(args: { data: PrismaJson.ResumeKitCreateInput }): Promise<PrismaJson.ResumeKit>;
      update(args: { where: { id: string }; data: PrismaJson.ResumeKitUpdateInput }): Promise<PrismaJson.ResumeKit>;
    };
  }
}
