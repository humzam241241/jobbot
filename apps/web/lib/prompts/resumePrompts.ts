/**
 * System prompt for the resume tailoring LLM
 * Instructs the AI to act as a technical recruiter and produce ATS-optimized resume content
 */
export const SYSTEM_RECRUITER = `
You are a technical recruiter at a fast-growing startup.
You will receive: (1) ORIGINAL resume (extracted), (2) JOB DESCRIPTION, and optionally (3) a PRIOR TAILORED resume.
Task: produce a TAILORED resume content plan and rewritten bullets that are ATS-optimized and show high potential for the JD.
Rules:
- Focus on results, impact, clarity; use action verbs, measurable outcomes, and industry terminology.
- Turn personal projects into business value statements.
- Highlight transferable skills from non-technical roles.
- Keep the original resume's section order and overall format (headings, order) unless a field is obviously missing.
- Preserve facts; do not fabricate employment or degrees.
- Output strictly JSON matching:
{
  "summary": string,
  "skills": string[],
  "experience": [{ "index": number, "title": string, "company": string, "location": string?, "startDate": string?, "endDate": string?, "bullets": string[] }],
  "education": [{ "index": number, "school": string, "degree": string?, "field": string?, "startDate": string?, "endDate": string?, "gpa": string? }]
}
"index" refers to the ORIGINAL item index so we can preserve ordering/format in rendering.
`;

/**
 * System prompt for the cover letter generation LLM
 * Instructs the AI to write a concise, compelling cover letter based on the resume and job description
 */
export const SYSTEM_COVER_LETTER = `
You are writing a concise, compelling cover letter.
Inputs: ORIGINAL resume, TAILORED resume, JOB DESCRIPTION.
Rules:
- 3 short paragraphs max + a bullet trio if relevant.
- Para 1: role/company, 1-line hook with quantified relevant win.
- Para 2: 2-3 tailored highlights mapped to JD priorities (from tailored resume).
- Para 3: cultural fit + call to action.
- Keep tone confident, specific, and human. No fluff or generic claims.
- Output plain text (no JSON).
`;

/**
 * User prompt template for resume tailoring
 * @param profile The extracted profile from the resume
 * @param jobDescription The job description text
 * @returns Formatted prompt for the LLM
 */
export function createResumePrompt(profile: any, jobDescription: string): string {
  return `
[ORIGINAL_RESUME]
${JSON.stringify(profile, null, 2)}

[JOB_DESCRIPTION]
${jobDescription}
`;
}

/**
 * User prompt template for cover letter generation
 * @param originalProfile The original extracted profile
 * @param tailoredProfile The tailored profile from the LLM
 * @param jobDescription The job description text
 * @returns Formatted prompt for the LLM
 */
export function createCoverLetterPrompt(
  originalProfile: any,
  tailoredProfile: any,
  jobDescription: string
): string {
  return `
[ORIGINAL_RESUME]
${JSON.stringify(originalProfile, null, 2)}

[TAILORED_RESUME]
${JSON.stringify(tailoredProfile, null, 2)}

[JOB_DESCRIPTION]
${jobDescription}
`;
}
