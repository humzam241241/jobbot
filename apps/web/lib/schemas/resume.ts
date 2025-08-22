import { z } from 'zod';

export const ExperienceItem = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(), // yyyy-mm or text
  endDate: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const EducationItem = z.object({
  school: z.string().min(1),
  degree: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  details: z.array(z.string()).default([]),
});

export const ProjectItem = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const TailoredResume = z.object({
  name: z.string().optional(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    website: z.string().optional(),
  }).default({}),
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceItem).default([]),
  education: z.array(EducationItem).default([]),
  projects: z.array(ProjectItem).default([]),
});

export const TailorResponse = z.object({
  tailoredResume: TailoredResume,
  coverLetter: z.string().default(''),
});

export type TailorResponseT = z.infer<typeof TailorResponse>;

// coerce/null-stripper
export function normalizeTailorJson(input: unknown): TailorResponseT {
  const cleaned = JSON.parse(JSON.stringify(input), (_k, v) => (v === null ? undefined : v));
  return TailorResponse.parse(cleaned);
}