import { GoogleGenerativeAI } from '@google/generative-ai';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';

export async function googleTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing GOOGLE_API_KEY'), { code: 'CONFIG_MISSING' });

  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });

  // Compact inputs to avoid token limits
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
  ].join('\n');

  try {
    // Try with JSON mode first
    let response;
    try {
      response = await m.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          ...(model.includes('gemini-2.5') ? {
            responseSchema: {
              type: 'object',
              properties: {
                tailoredResume: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    contact: { type: 'object' },
                    summary: { type: 'string' },
                    skills: { type: 'array', items: { type: 'string' } },
                    experience: { type: 'array', items: { type: 'object' } },
                    projects: { type: 'array', items: { type: 'object' } },
                    education: { type: 'array', items: { type: 'object' } }
                  }
                },
                coverLetter: { type: 'string' }
              }
            }
          } : {
            responseMimeType: "application/json"
          })
        }
      });
    } catch (genError) {
      // If JSON mode fails, try basic prompt
      console.warn('JSON mode failed, falling back to basic prompt', genError);
      response = await m.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      });
    }

    // Extract text from response
    const text = typeof response?.response?.text === 'function'
      ? response.response.text()
      : (response?.response?.text ?? '');

    // Handle empty responses
    if (!text?.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }

    return parseAndNormalizeLLMTextOrThrow(String(text));
  } catch (err: any) {
    // Handle specific error types
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

    if (status === 401 || /invalid.*api.*key|permission/i.test(msg)) {
      const e: any = new Error('AUTH_ERROR');
      e.code = 'AUTH_ERROR';
      e.raw = msg.slice(0, 1000);
      throw e;
    }

    // Pass through known errors
    if (err.code) throw err;

    // Wrap unknown errors
    const wrapped: any = new Error(err.message || 'Google error');
    wrapped.code = 'UNEXPECTED_ERROR';
    wrapped.raw = err.raw || String(err);
    throw wrapped;
  }
}