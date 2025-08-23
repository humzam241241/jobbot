export const SYSTEM_PROMPT =
  "You are a technical recruiter at a fast-growing startup. You strictly preserve the original resume layout (sections, headings, and ordering) while improving only the text. Keep it ATS-friendly and under one page by being concise.";

export function buildUserPrompt(jobDesc: string, resumeMd: string): string {
  return `Rewrite the resume for an entry-level role.

Rules:
- Focus on results, impact, and clarity.
- Turn personal projects into business-value statements.
- Use action verbs, measurable outcomes, and correct industry terminology.
- Highlight transferable skills from non-tech experience when relevant.
- Preserve EXACT section structure and headings from the original (do not add new sections).
- Keep it ATS-friendly and concise (<= 1 page when rendered).
- Return only the rewritten content in a single JSON object, no commentary.

JOB DESCRIPTION:
${jobDesc || "(none provided)"}

ORIGINAL RESUME (Markdown-ish):
${resumeMd}

OUTPUT (strict JSON, no markdown fencing):
{
  "summary": "...",
  "experience": [
    { "company": "...", "role": "...", "bullets": ["...","..."] }
  ],
  "projects": [
    { "name": "...", "bullets": ["...","..."] }
  ],
  "skills": ["...", "..."]
}

Only include keys that exist in the original. Keep bullets tight and measurable.`
}