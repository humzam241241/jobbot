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
 * Instructs the AI to write a comprehensive, compelling cover letter based on the resume and job description
 */
export const SYSTEM_COVER_LETTER = `
You are writing a comprehensive, compelling cover letter that fills a full page.
Inputs: ORIGINAL resume, TAILORED resume, JOB DESCRIPTION.
Rules:
- Create a detailed cover letter with 4-5 paragraphs that will fill a full page.
- Para 1: Introduce yourself, mention the specific role/company, and include a strong hook with quantified relevant achievement.
- Para 2: Elaborate on your relevant experience and skills that directly match the job requirements (3-4 sentences).
- Para 3: Provide specific examples of your achievements that demonstrate your qualifications (3-4 sentences).
- Para 4: Explain why you're interested in this specific company and how you align with their values/mission (2-3 sentences).
- Para 5: Strong closing with enthusiasm and a clear call to action.
- Use specific keywords from the job description.
- Keep tone confident, professional, and human. Be specific rather than generic.
- Optimize the length to fill a full page (approximately 400-500 words).
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
