import { GoogleGenerativeAI } from '@google/generative-ai';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';
import { pickModel } from '@/lib/ai/modelMap';

export async function googleTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model?: string; }): Promise<TailoredResume> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing GOOGLE_API_KEY'), { code: 'CONFIG_MISSING' });

  const finalModel = pickModel('google', model);
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model: finalModel });

  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  const prompt = [
    TAILOR_RESUME_SYSTEM,
    '',
    '--- ORIGINAL RESUME ---',
    rez,
    '',
    '--- JOB DESCRIPTION ---',
    jd,
    '',
    // Strong JSON "rails" (don't rely on response_schema for complex nested arrays)
    'Return ONLY a JSON object matching this shape (no extra text):',
    `{
  "name": string,
  "contact": { "email": string, "phone": string | null, "location": string | null, "linkedin": string | null, "github": string | null },
  "summary": string,
  "skills": string[],
  "experience": [{ "company": string, "role": string, "location": string | null, "dates": string | null, "bullets": string[] }],
  "projects": [{ "name": string, "tech": string[] | null, "bullets": string[] }],
  "education": [{ "school": string, "degree": string | null, "dates": string | null }],
  "ats_keywords": string[],
  "cover_letter": string
}`,
  ].join('\n');

  try {
    const result = await m.generateContent(prompt);
    const text = typeof result?.response?.text === 'function'
      ? result.response.text()
      : (result?.response?.text ?? '');

    if (!text || !String(text).trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }
    return parseAndNormalizeLLMTextOrThrow(String(text));
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const status = err?.status ?? err?.cause?.status;

    if (status === 429 || /Too Many Requests|quota/i.test(msg)) {
      const e: any = new Error('RATE_LIMIT');
      e.code = 'RATE_LIMIT';
      e.status = 429;
      const m = /retryDelay":"(\d+)s"/.exec(msg);
      e.retryAfter = m ? Number(m[1]) : 3;
      e.raw = msg.slice(0, 1000);
      throw e;
    }

    // JSON mode schema complaints
    if (/response_schema|should be non-empty for OBJECT type/i.test(msg)) {
      const e: any = new Error('JSON_MODE_UNSUPPORTED_SHAPE');
      e.code = 'JSON_MODE_UNSUPPORTED_SHAPE';
      e.raw = msg.slice(0, 1000);
      throw e;
    }

    throw err;
  }
}