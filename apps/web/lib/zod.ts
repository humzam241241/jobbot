import { z } from 'zod';

// Common types used across the application
export const TelemetryIdSchema = z.string().uuid().optional();

// Resume generation schemas
export const JobDescriptionSchema = z.object({
  jobUrl: z.string().url().optional(),
  jobPostingUrl: z.string().url().optional(),
  jobDescriptionText: z.string().min(50).optional(),
}).refine(data => data.jobUrl || data.jobPostingUrl || data.jobDescriptionText, {
  message: "At least one of jobUrl, jobPostingUrl, or jobDescriptionText must be provided",
});

export const ResumeInputSchema = z.object({
  userId: z.string().optional(),
  jobDescription: JobDescriptionSchema,
  masterResumeText: z.string().optional(),
  resumeFile: z.any().optional(), // File object from form data
  notes: z.string().optional(),
  providerPreference: z.enum(['openai', 'anthropic', 'google', 'auto']).optional().default('auto'),
  model: z.string().optional(),
  telemetryId: TelemetryIdSchema,
});

export const ResumeKitSchema = z.object({
  summary: z.string().min(30),
  highlights: z.array(z.string()).min(3),
  experienceBullets: z.array(z.string()).min(5),
  skills: z.array(z.string()).min(10),
  coverLetter: z.string().min(200),
});

// API response schemas
export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  telemetryId: TelemetryIdSchema,
});

export const ApiSuccessSchema = z.object({
  ok: z.literal(true),
  partial: z.boolean().optional(),
  artifacts: z.object({
    coverLetterMd: z.string(),
    resumeMd: z.string(),
    pdfs: z.array(z.object({
      name: z.string(),
      url: z.string(),
    })),
  }),
  telemetryId: TelemetryIdSchema,
  usedProvider: z.string(),
});

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema]);

// AI provider schemas
export const GenInputSchema = z.object({
  prompt: z.string(),
  schema: z.any(), // ZodSchema
  timeoutMs: z.number().optional(),
});

export const GenResultSchema = z.object({
  json: z.any(),
  raw: z.any(),
  tokensUsed: z.number().optional(),
});

// Error codes
export const ErrorCodes = {
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  RENDER_FAIL: 'RENDER_FAIL',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
