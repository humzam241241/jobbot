// apps/web/lib/pipeline/generateContent.ts
import "server-only";

import { llm } from "@server/providers/llm"; // use your existing provider switch
import { extractStructure } from "@server/resume/parser"; // see next step; graceful fallback if missing
import type { Profile } from "@/lib/schemas/profile";

export type GenInputs = {
  resumeOriginalText: string;
  resumeOriginalHtml?: string; // if we can get HTML-ish from PDF/DOCX parser
  jdText: string;
  jdUrl?: string;
  modelHint?: string;
  applicantName?: string;
  profile?: Profile; // Add extracted profile
};

export type GenOutputs = {
  resumeHtml: string;
  coverHtml: string;
};

export async function generateContent(input: GenInputs): Promise<GenOutputs> {
  const structureHints = extractStructure(input.resumeOriginalText);
  const system = `
You are creating a tailored resume and cover letter for a job application.
Use the candidate's EXTRACTED PROFILE information when available, and fall back to the raw resume text when needed.

Rules:
- Use the candidate's actual information from their profile - never invent details.
- Preserve sections and their order when reasonable (e.g., Summary, Skills, Experience, Education).
- Keep bullets/bold/italics and date/location lines.
- Tailor bullets with the JD's language when truthful; otherwise leave as-is.
- Keep resume to 1–2 pages worth of content (concise).
- Output valid semantic HTML ONLY. No markdown. Use <h1..h3>, <p>, <ul><li>, <strong>, <em>.
- Do NOT include <html> <head> <body>. We only want the inner fragment.
- The cover letter must be different from the resume - it should be a proper letter addressing the employer.
- The cover letter should highlight how the candidate's experience matches the job requirements.

Give two fragments:
1) <RESUME_HTML> ... </RESUME_HTML>
2) <COVER_HTML> ... </COVER_HTML>
`;

  const user = `
[EXTRACTED_PROFILE]
${JSON.stringify(input.profile || {}, null, 2)}

[RESUME_TEXT]
${input.resumeOriginalText}

[STRUCTURE_HINTS]
${JSON.stringify(structureHints)}

[JOB_DESCRIPTION]
${input.jdText}

${input.jdUrl ? `[JOB_URL]\n${input.jdUrl}` : ''}
`;

  const raw = await llm.complete({ system, user, model: input.modelHint });
  const resumeHtml = pickBetween(raw, "<RESUME_HTML>", "</RESUME_HTML>");
  const coverHtml = pickBetween(raw, "<COVER_HTML>", "</COVER_HTML>");
  return { resumeHtml, coverHtml };
}

function pickBetween(s: string, a: string, b: string) {
  const i = s.indexOf(a), j = s.indexOf(b);
  if (i === -1 || j === -1 || j <= i) return s; // fallback
  return s.slice(i + a.length, j).trim();
}