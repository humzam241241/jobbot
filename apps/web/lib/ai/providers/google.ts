import { GoogleGenerativeAI } from '@google/generative-ai';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';

export async function googleTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');

  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });

  const prompt = [
    TAILOR_RESUME_SYSTEM,
    '',
    '--- ORIGINAL RESUME ---',
    resumeText,
    '',
    '--- JOB DESCRIPTION ---',
    jobDescription,
  ].join('\n');

  const result = await m.generateContent(prompt);
  const text = result?.response?.text?.() ?? result?.response?.text ?? '';
  return parseAndNormalizeLLMTextOrThrow(text);
}