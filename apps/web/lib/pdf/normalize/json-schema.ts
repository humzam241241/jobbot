import { z } from 'zod';

/**
 * Schema for experience items
 */
export const ExperienceItem = z.object({
  title: z.string(),
  company: z.string().optional(),
  location: z.string().optional(),
  dates: z.string().optional(),
  bullets: z.array(z.string()).max(8).default([])
});

/**
 * Schema for education items
 */
export const EducationItem = z.object({
  school: z.string(),
  degree: z.string().optional(),
  dates: z.string().optional(),
  details: z.array(z.string()).max(6).default([])
});

/**
 * Schema for resume data
 */
export const ResumeData = z.object({
  profile: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceItem).default([]),
  education: z.array(EducationItem).default([]),
  extras: z.record(z.string(), z.any()).optional()
});

/**
 * Type for resume data
 */
export type ResumeDataType = z.infer<typeof ResumeData>;

/**
 * Parse JSON string into resume data
 * @param jsonString JSON string from LLM
 * @returns Parsed and validated resume data
 */
export function parseResumeJson(jsonString: string): ResumeDataType {
  try {
    // Try standard JSON.parse first
    const parsed = JSON.parse(jsonString);
    return ResumeData.parse(parsed);
  } catch (error) {
    // If standard parsing fails, try to extract JSON from a code block
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const extracted = JSON.parse(jsonMatch[1]);
        return ResumeData.parse(extracted);
      } catch (innerError) {
        // If that fails too, try JSON5
        try {
          const JSON5 = require('json5');
          const parsed = JSON5.parse(jsonMatch[1]);
          return ResumeData.parse(parsed);
        } catch (json5Error) {
          throw new Error(`Failed to parse JSON: ${error.message}`);
        }
      }
    } else {
      // Try JSON5 as a last resort
      try {
        const JSON5 = require('json5');
        const parsed = JSON5.parse(jsonString);
        return ResumeData.parse(parsed);
      } catch (json5Error) {
        throw new Error(`Failed to parse JSON: ${error.message}`);
      }
    }
  }
}

/**
 * System prompt for LLM to generate resume content
 */
export const SYSTEM_PROMPT = `
You MUST return valid JSON only (no prose).
Schema fields: profile, skills[], experience[{title,company,location,dates,bullets[]}], education[{school,degree,dates,details[]}].
Tailor content to the job description, quantify achievements, keep bullets concise (≤ 20 words).
Do not invent dates or employers. Omit if unknown.
`;

/**
 * Create a user prompt for the LLM
 * @param resumeText Original resume text
 * @param jobDescription Job description
 * @returns Formatted prompt
 */
export function createUserPrompt(resumeText: string, jobDescription: string): string {
  return `
RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Please tailor this resume to the job description. Return ONLY valid JSON matching the schema.
`;
}
