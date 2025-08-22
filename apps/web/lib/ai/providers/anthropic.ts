import Anthropic from "@anthropic-ai/sdk";
import { logger } from '@/lib/logging/logger';
import { modelFor } from './router';

const SYSTEM_PROMPT = `Act as a senior technical recruiter at a fast-growing startup. Your task is to REWRITE the candidate's resume content to present them as a high-potential entry-level hire.

MANDATORY FORMAT & LAYOUT RULES:
- Keep the original resume layout, section order, headings, and overall structure exactly as provided by the user's input. Do not add new sections. Do not remove existing sections. Do not shuffle section order.
- Preserve spacing, bullets vs. paragraphs, and approximate line lengths so the resume remains ATS-friendly and ≤1 page.
- If the original resume is slightly "odd," keep its stylistic quirks but improve clarity and correctness.
- Use plain Unicode characters only; avoid fancy symbols or non-ATS fonts.

CONTENT RULES:
- Rewrite bullet points with high-impact action verbs, measurable outcomes, and correct industry terminology.
- Convert personal/academic projects into business-value statements that show results, users served, cost/time saved, or quality improved.
- Highlight transferable skills from non-tech experience when relevant (customer focus, ops rigor, communication, ownership, reliability).
- Prioritize results, impact, and clarity over tasks and tool lists.
- Respect the candidate's seniority: emphasize learning velocity, collaboration, and reliable delivery for entry-level roles.
- Remove fluff, clichés, and filler; keep only the strongest evidence.
- Keep tech stacks accurate and concise. Avoid tool bloat.
- Maintain an inclusive and professional tone. No exaggerations or unverifiable claims.

OUTPUT RULES:
- Return only the rewritten resume body text in the same section order and bullet structure as the original. Do not include analysis or explanations.
- Keep it ATS-friendly (no tables, no text boxes, minimal special characters).
- Keep it under one page if the source is longer; compress by merging redundant bullets and tightening phrasing.`;

export async function anthropicTailorResume({ 
  apiKey, 
  model, 
  resumeText, 
  jobDescription 
}: { 
  apiKey: string; 
  model?: string; 
  resumeText: string; 
  jobDescription: string; 
}): Promise<string> {
  const effectiveModel = modelFor('anthropic', model);
  const client = new Anthropic({ apiKey });

  const userPrompt = [
    'ORIGINAL RESUME (PRESERVE LAYOUT):',
    '<<<RESUME_START',
    resumeText,
    'RESUME_END>>>',
    '',
    'TARGET JOB DESCRIPTION:',
    '<<<JD_START',
    jobDescription,
    'JD_END>>>',
  ].join('\n');

  try {
    logger.debug('Calling Anthropic with model:', effectiveModel);
    const msg = await client.messages.create({
      model: effectiveModel,
      max_tokens: 4000,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = msg.content?.map(c => (c.type === "text" ? c.text : "")).join("") ?? "";
    if (!text.trim()) {
      throw new Error('Empty response from Anthropic');
    }

    return text;
  } catch (err: any) {
    logger.error('Anthropic error:', err);
    throw err;
  }
}