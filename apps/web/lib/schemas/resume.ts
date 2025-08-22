import { z } from "zod";

/**
 * Schema for contact information in a resume
 */
export const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  links: z.array(z.string()).optional(),
  location: z.string().optional(),
});

/**
 * Schema for experience entries in a resume
 */
export const ExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  start: z.string(),
  end: z.string().optional(),
  bullets: z.array(z.string()).max(8),
});

/**
 * Schema for education entries in a resume
 */
export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string(),
  year: z.string().optional(),
  gpa: z.string().optional(),
  details: z.array(z.string()).optional(),
});

/**
 * Schema for project entries in a resume
 */
export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  bullets: z.array(z.string()),
  technologies: z.array(z.string()).optional(),
});

/**
 * Schema for a complete resume
 */
export const ResumeSchema = z.object({
  contact: ContactSchema,
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
  })).optional(),
});

/**
 * Type for a resume based on the schema
 */
export type Resume = z.infer<typeof ResumeSchema>;

/**
 * Schema for a cover letter
 */
export const CoverLetterSchema = z.object({
  header: z.object({
    applicant: z.string(),
    contact: z.string(),
    date: z.string(),
  }),
  employer: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  greeting: z.string(),
  body: z.array(z.string()),
  closing: z.string(),
  signature: z.string(),
});

/**
 * Type for a cover letter based on the schema
 */
export type CoverLetter = z.infer<typeof CoverLetterSchema>;
