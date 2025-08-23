import { createLogger } from '@/lib/logger';

const logger = createLogger('resume-prompts');

export function resumeSuperPrompt(args: {
  rawResumeText: string;
  jobDescriptionText?: string;
}): string {
  const { rawResumeText, jobDescriptionText = "" } = args;

  logger.info('Building resume prompt', {
    resumeLength: rawResumeText.length,
    jobDescriptionLength: jobDescriptionText.length
  });

  return `
Act as a technical recruiter at a fast-growing startup.

You will transform the *content* of the candidate's resume while preserving the original layout/sections (Contact, Summary/Objective, Skills, Experience, Projects, Education). Do **not** invent employers or degrees. Rewrite bullet points only—use strong action verbs, measurable outcomes, and correct industry terminology. Maintain ATS-friendly structure, concise phrasing, and keep it under one page.

If relevant, highlight transferable skills from non-tech experience. Convert personal projects into statements of business value (impact, metrics, user outcomes, cost savings, reliability gains, etc.). Keep dates, titles, and employer names as-is unless obviously malformed.

Also produce a targeted cover letter for the given job, and an ATS report that scores keyword alignment to the job description.

Return STRICT JSON with this schema:
{
  "resume_markdown": string,   // Markdown that mirrors the original order of sections
  "cover_letter_markdown": string,
  "ats_report": {
    "score": number,           // 0..100
    "matched_keywords": string[],
    "missing_keywords": string[],
    "notes": string[]
  }
}

Inputs:
- Candidate resume text (verbatim, extracted from PDF):
<<<RESUME>>>
${rawResumeText}
<<<END RESUME>>>

- Target job description (may be empty):
<<<JOB>>>
${jobDescriptionText}
<<<END JOB>>>

Rules:
- Preserve the original section order and headings if present.
- Use short bullets; start with action verbs; quantify results where plausible.
- Prefer industry terms used in the job description when appropriate.
- Keep page-length constraints by removing less-relevant bullets first.
- Do not return anything except the JSON object.
`;
}
