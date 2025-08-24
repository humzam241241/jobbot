import { z } from 'zod';

/**
 * Schema for the tailored resume
 * This ensures that the LLM output follows the expected structure
 */
export const TailoredResumeSchema = z.object({
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).optional(),
  }),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(z.object({
    title: z.string(),
    company: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bullets: z.array(z.string()),
  })),
  education: z.array(z.object({
    degree: z.string().optional(),
    school: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    gpa: z.string().optional(),
    details: z.array(z.string()).optional(),
  })),
  gaps: z.array(z.string()).optional(),
});

/**
 * Type definition for the tailored resume
 */
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

/**
 * Schema for the cover letter
 */
export const CoverLetterSchema = z.object({
  date: z.string(),
  recipient: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    company: z.string(),
    address: z.string().optional(),
  }),
  greeting: z.string(),
  introduction: z.string(),
  body: z.array(z.string()),
  closing: z.string(),
  signature: z.string(),
});

/**
 * Type definition for the cover letter
 */
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

/**
 * Schema for the ATS report
 */
export const ATSReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  keywordCoverage: z.object({
    matched: z.array(z.string()),
    missingCritical: z.array(z.string()),
    niceToHave: z.array(z.string()),
  }),
  sectionScores: z.object({
    summary: z.number().min(0).max(10),
    skills: z.number().min(0).max(10),
    experience: z.number().min(0).max(10),
    education: z.number().min(0).max(10),
  }),
  redFlags: z.array(z.string()),
  lengthAndFormatting: z.object({
    pageCountOK: z.boolean(),
    lineSpacingOK: z.boolean(),
    bulletsOK: z.boolean(),
  }),
  concreteEdits: z.array(z.object({
    section: z.string(),
    before: z.string(),
    after: z.string(),
  })),
  finalRecommendations: z.array(z.string()),
});

/**
 * Type definition for the ATS report
 */
export type ATSReport = z.infer<typeof ATSReportSchema>;
