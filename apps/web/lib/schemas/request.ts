import { z } from 'zod';

export const GenerateRequestSchema = z.object({
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters long'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.enum(['auto', 'openai', 'anthropic', 'google']).default('auto'),
  model: z.string().min(1, 'Model is required'),
  masterResume: z.object({
    text: z.string().min(1, 'Resume text is required'),
    format: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }).or(z.string().min(1, 'Resume text is required')),
  applicantProfile: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string().url()).optional(),
    skills: z.array(z.string()).optional(),
  }).optional(),
  preserveFormat: z.boolean().optional().default(true),
  extra: z.record(z.any()).optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
