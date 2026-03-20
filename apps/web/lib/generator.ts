import { generateAny } from "./ai/generate";
import type { Usage } from "./ai/types";
import { scrapeJobSummary } from "@/lib/job";
import { RESUME_CONTENT_SYSTEM_PROMPT } from "./prompts/resumeContent";
import { COVER_LETTER_SYSTEM_PROMPT } from "./prompts/coverLetterContent";
import { computeAtsScore } from "./ats/computeAtsScore";

const SYSTEM = RESUME_CONTENT_SYSTEM_PROMPT;

function parseAiResponse(text: string): { resumeJson: object | null } {
  let resumeJson: object | null = null;
  try {
    // The AI should return pure JSON, but handle markdown wrapping just in case
    const cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        resumeJson = JSON.parse(jsonMatch[1]);
      }
    } else if (cleanText.startsWith('{')) {
      // Try to parse as direct JSON
      resumeJson = JSON.parse(cleanText);
    }
  } catch (e) {
    console.error("Failed to parse resume JSON from AI response:", e);
    console.error("AI response was:", text);
    resumeJson = null;
  }

  return { resumeJson };
}

async function generateCoverLetter(resumeJson: any, jobSummary: string, notes?: string, provider?: string, model?: string): Promise<{
  coverHtml: string;
  usage: Usage;
}> {
  const USER = `
JOB DESCRIPTION:
${jobSummary}

CANDIDATE RESUME:
${JSON.stringify(resumeJson, null, 2)}

${notes ? `ADDITIONAL NOTES:\n${notes}\n` : ''}`;

  const out = await generateAny(provider, { system: COVER_LETTER_SYSTEM_PROMPT, user: USER, model });
  return {
    coverHtml: out.text,
    usage: out.usage
  };
}

export async function generateKitMulti({
  jobUrl, masterResume, model, provider, notes
}: { jobUrl: string; masterResume: string; model?: string; provider?: string; notes?: string; }): Promise<{
  resumeJson: object | null;
  resumeHtml: string;
  coverHtml: string;
  atsReport: string;
  jobSummary: string;
  usage: Usage;
}> {
  // This function will now let errors propagate up to the API route handler,
  // which is responsible for catching them and sending the correct response to the client.

  const { hasAnyProvider } = await import("@/lib/providers");
  if (!masterResume?.trim()) throw new Error("Master resume content is required.");
  if (!jobUrl?.trim()) throw new Error("Job URL is required.");
  if (!hasAnyProvider()) throw new Error("No AI provider API keys configured.");

  let jobSummary = "Unable to fetch job description.";
  try {
    jobSummary = await scrapeJobSummary(jobUrl);
  } catch (error) {
    console.error("Job scraping failed:", error);
    jobSummary = `Content extraction failed for ${jobUrl}. The AI will proceed without it, but providing job details in the notes is recommended.`;
  }

  const USER = `
JOB POSTING:
${jobSummary}

MASTER RESUME:
${masterResume}

${notes ? `ADDITIONAL NOTES:\n${notes}\n` : ''}`;

  // Step 1: Generate the tailored resume content
  const resumeOut = await generateAny(provider, { system: SYSTEM, user: USER, model });
  const { resumeJson } = parseAiResponse(resumeOut.text);

  // If parsing fails, we'll still create a structured error that the API route can handle
  if (!resumeJson) {
    return {
      resumeJson: null,
      resumeHtml: `<article><h2>Generation Failed</h2><p>Could not parse structured JSON from the AI's response.</p><pre>${resumeOut.text}</pre></article>`,
      coverHtml: `<article><h2>Cover Letter</h2><p>Unable to generate cover letter without valid resume data.</p></article>`,
      atsReport: `<article><h2>ATS Report Unavailable</h2><p>Could not parse resume data.</p></article>`,
      jobSummary,
      usage: resumeOut.usage,
    };
  }

  // Step 2: Generate the cover letter based on the resume JSON and job description
  const { coverHtml, usage: coverUsage } = await generateCoverLetter(resumeJson, jobSummary, notes, provider, model);

  // Step 3: Generate real ATS report using the parsed resume data
  const resumeText = JSON.stringify(resumeJson);
  const atsScore = computeAtsScore(resumeText, jobSummary);
  
  const atsReport = `
    <article>
      <h2>ATS Compatibility Report</h2>
      <h3>Overall Match Score: ${atsScore.matchPercent}%</h3>
      <p><strong>Assessment:</strong> ${atsScore.matchPercent >= 70 ? 'Strong match' : atsScore.matchPercent >= 50 ? 'Good match with room for improvement' : 'Needs optimization for better ATS compatibility'}</p>
      
      <h3>✅ Section Breakdown</h3>
      <ul>
        <li>Skills Match: ${atsScore.sectionBreakdown.skills}%</li>
        <li>Experience Match: ${atsScore.sectionBreakdown.experience}%</li>
        <li>Education Match: ${atsScore.sectionBreakdown.education}%</li>
      </ul>
      
      ${atsScore.missingKeywords.length > 0 ? `
        <h3>⚠️ Missing High-Value Keywords (${atsScore.missingKeywords.length} identified)</h3>
        <ul>
          ${atsScore.missingKeywords.map(keyword => `<li>${keyword}</li>`).join('')}
        </ul>
      ` : ''}
      
      ${atsScore.weakKeywords.length > 0 ? `
        <h3>📈 Strengthen These Keywords</h3>
        <ul>
          ${atsScore.weakKeywords.map(keyword => `<li>${keyword} (mentioned only once)</li>`).join('')}
        </ul>
      ` : ''}
      
      <h3>🎯 Optimization Recommendations</h3>
      <ul>
        ${atsScore.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
      </ul>
    </article>
  `;

  // Combine usage from both API calls
  const combinedUsage = {
    inputTokens: (resumeOut.usage.inputTokens || 0) + (coverUsage.inputTokens || 0),
    outputTokens: (resumeOut.usage.outputTokens || 0) + (coverUsage.outputTokens || 0),
    totalTokens: (resumeOut.usage.totalTokens || 0) + (coverUsage.totalTokens || 0),
    model: resumeOut.usage.model,
    provider: resumeOut.usage.provider
  };

  return {
    resumeJson,
    resumeHtml: '', // This will be generated by the template in the API route
    coverHtml,
    atsReport,
    jobSummary,
    usage: combinedUsage,
  };
}