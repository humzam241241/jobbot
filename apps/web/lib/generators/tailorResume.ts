import { z } from 'zod';
import { extractJsonBlocks, normalizeResumeJson } from '@/lib/ai/json';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';

const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
}).strict().partial();

const ExperienceItem = z.object({
  title: z.string(),
  company: z.string().optional(),
  dates: z.string().optional(),
  bullets: z.array(z.string()).default([]),
}).strict();

export const TailoredResumeSchema = z.object({
  name: z.string().optional().default(''),
  contact: ContactSchema.default({}),
  summary: z.string().optional().default(''),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceItem).default([]),
  projects: z.array(z.object({
    name: z.string(),
    bullets: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string().optional(),
    dates: z.string().optional(),
  })).default([]),
  coverLetter: z.string().optional().default(''),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

// Helper used by all providers after we get text back
export function parseAndNormalizeLLMTextOrThrow(text: string) {
  const raw = extractJsonBlocks(text);
  if (!raw) {
    const err: any = new Error('Failed to parse model response (no JSON found)');
    err.code = 'JSON_PARSE_ERROR';
    err.preview = (text || '').slice(0, 800);
    throw err;
  }
  const normalized = normalizeResumeJson(raw);
  const parsed = TailoredResumeSchema.safeParse(normalized);
  if (!parsed.success) {
    const err: any = new Error('Failed to validate normalized JSON');
    err.code = 'JSON_VALIDATE_ERROR';
    err.preview = JSON.stringify(normalized, null, 2).slice(0, 800);
    err.issues = parsed.error.issues;
    throw err;
  }
  return parsed.data;
}