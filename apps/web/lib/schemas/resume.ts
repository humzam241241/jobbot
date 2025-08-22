import { z } from 'zod';

export const ExperienceItem = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().optional(),
  dates: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const EducationItem = z.object({
  school: z.string().min(1),
  degree: z.string().optional(),
  dates: z.string().optional(),
  details: z.array(z.string()).default([]),
});

export const ProjectItem = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tech: z.array(z.string()).optional(),
  bullets: z.array(z.string()).default([]),
});

export const ContactInfo = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
}).default({});

export const TailoredResume = z.object({
  name: z.string().optional(),
  contact: ContactInfo,
  summary: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceItem).default([]),
  education: z.array(EducationItem).default([]),
  projects: z.array(ProjectItem).default([]),
}).transform(data => {
  // Add computed properties
  const bulletsCount = data.experience.reduce((sum, exp) => sum + exp.bullets.length, 0);
  return { ...data, bulletsCount };
});

export const tailorResponseSchema = z.object({
  tailoredResume: TailoredResume,
  coverLetter: z.object({
    text: z.string().default(''),
  }).or(z.string()).transform(v => typeof v === 'string' ? { text: v } : v),
});

export type TailorResponseT = z.infer<typeof tailorResponseSchema>;