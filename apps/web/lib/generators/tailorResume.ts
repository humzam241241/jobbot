import { z } from 'zod';
import { extractJsonBlocks, normalizeResumeJson } from '@/lib/ai/json';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';

// turns null → undefined so optional defaults apply
const NullableStr = z.preprocess(v => (v === null ? undefined : v), z.string().optional());

// contact allows any subset, but no nulls
const ContactSchema = z.object({
  email: NullableStr,
  phone: NullableStr,
  linkedin: NullableStr,
  github: NullableStr,
}).passthrough(); // allow extra keys if model adds them

const ExperienceItem = z.object({
  title: z.string(),
  company: NullableStr,
  dates: NullableStr,
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
    degree: NullableStr,
    dates: NullableStr,
  })).default([]),
  coverLetter: z.string().optional().default(''),
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

export function parseAndNormalizeLLMTextOrThrow(text: string) {
  const raw = extractJsonBlocks(text);
  if (!raw) {
    const err: any = new Error('JSON_PARSE_ERROR: No JSON found in model output');
    err.code = 'JSON_PARSE_ERROR';
    err.preview = (text || '').slice(0, 1200);
    throw err;
  }
  const normalized = normalizeResumeJson(raw);
  const parsed = TailoredResumeSchema.safeParse(normalized);
  if (!parsed.success) {
    const err: any = new Error('JSON_VALIDATE_ERROR: Zod validation failed');
    err.code = 'JSON_VALIDATE_ERROR';
    err.preview = JSON.stringify(normalized, null, 2).slice(0, 1200);
    err.issues = parsed.error.issues;
    throw err;
  }
  return parsed.data;
}