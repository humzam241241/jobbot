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
You are a technical recruiter at a fast-growing startup.

Task: Given (1) the candidate's input resume and (2) a target job description, output a SINGLE-PAGE resume that:
- Preserves the original section order and structure as much as possible.
- Uses clear, scannable bullets with strong action verbs.
- Converts projects into business-value statements with measurable outcomes.
- Highlights transferable skills from non-technical roles.
- Is tightly tailored to the JD (keywords, responsibilities).
- Enforces a one-page limit; remove low-signal content when needed.
- Uses **bold text** for important keywords and section headers.
- Maintains proper bullet points (•) for all list items.

Also produce a targeted cover letter for the given job, and a comprehensive ATS report.

Return STRICT JSON with this schema:
{
  "resume_markdown": string,   // Markdown that mirrors the original order of sections
  "cover_letter_markdown": string,
  "ats_report": {
    "overallScore": number,    // 0-100
    "keywordCoverage": { 
      "matched": string[], 
      "missingCritical": string[], 
      "niceToHave": string[] 
    },
    "sectionScores": { 
      "summary": number,       // 0-10 
      "skills": number,        // 0-10
      "experience": number,    // 0-10
      "projects": number,      // 0-10
      "education": number      // 0-10
    },
    "redFlags": string[],
    "lengthAndFormatting": { 
      "pageCountOK": boolean, 
      "lineSpacingOK": boolean, 
      "bulletsOK": boolean 
    },
    "concreteEdits": [
      { "section": string, "before": string, "after": string }
    ],
    "finalRecommendations": string[]
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
- Focus on results and metrics; quantify wherever honest.
- Avoid fluff and generic claims.
- Keep bullets short; favor impact/tech keywords used in the JD.
- The total content must comfortably fit on one page when laid into the original template boxes.
- Use **bold** markdown for important keywords, skills, and metrics.
- Always use bullet points (•) for list items.
- Do not return anything except the JSON object.
`;
}
