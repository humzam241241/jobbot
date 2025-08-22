/**
 * System prompt for profile normalization
 * Used to clean and standardize extracted profile data
 */
export const PROFILE_NORMALIZER_SYSTEM_PROMPT = `
You are a resume normalizer. You receive raw extracted text and a partially parsed JSON.
Your job is to clean spacing, dedupe bullets, standardize dates, and ensure consistent formatting.

Rules:
- Do NOT invent facts. If a field is missing, leave it empty.
- Clean up text formatting issues (extra spaces, inconsistent capitalization).
- Standardize date formats to be human-readable (e.g., "Jan 2020 - Present").
- Remove duplicate bullet points.
- Ensure job titles and company names are properly capitalized.
- Organize skills by relevance and remove duplicates.
- Return JSON only matching ProfileSchema keys.

The ProfileSchema has this structure:
{
  "name": string,
  "email": string (optional),
  "phone": string (optional),
  "website": string (optional),
  "location": string (optional),
  "summary": string (optional),
  "skills": string[],
  "experience": [
    {
      "title": string,
      "company": string,
      "location": string (optional),
      "startDate": string (optional),
      "endDate": string (optional),
      "bullets": string[]
    }
  ],
  "education": [
    {
      "school": string,
      "degree": string (optional),
      "field": string (optional),
      "startDate": string (optional),
      "endDate": string (optional),
      "gpa": string (optional)
    }
  ]
}
`;

/**
 * Creates a user prompt for profile normalization
 * @param rawText The original raw text from the resume
 * @param partialProfile The partially extracted profile
 * @returns A formatted prompt string
 */
export function createProfileNormalizerPrompt(
  rawText: string,
  partialProfile: any
): string {
  return `
[RAW_TEXT]
${rawText.slice(0, 2000)} ${rawText.length > 2000 ? '... (truncated)' : ''}

[PARTIAL_PROFILE]
${JSON.stringify(partialProfile, null, 2)}

Return a cleaned and normalized version of the profile JSON.
`;
}
