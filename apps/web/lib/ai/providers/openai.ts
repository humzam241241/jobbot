// apps/web/lib/ai/providers/openai.ts
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';

export async function openaiTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing OPENAI_API_KEY'), { code: 'CONFIG_MISSING' });

  // Compact inputs to avoid token limits
  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: TAILOR_RESUME_SYSTEM },
          { role: 'user', content: [
            '--- ORIGINAL RESUME ---\n' + rez,
            '--- JOB DESCRIPTION ---\n' + jd,
          ].join('\n\n') }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }, // Force JSON mode for GPT-4 and newer
      }),
    });

    const json = await res.json().catch(() => ({}));
    const text = json?.choices?.[0]?.message?.content ?? '';

    // Handle API errors
    if (!res.ok) {
      const msg = String(json?.error?.message ?? 'OpenAI error');
      const status = res.status;

      // Handle specific error types
      if (status === 429 || /rate.*limit|quota/i.test(msg)) {
        const e: any = new Error('RATE_LIMIT');
        e.code = 'RATE_LIMIT';
        e.status = 429;
        e.retryAfter = Number(res.headers.get('retry-after')) || 3;
        e.raw = msg;
        throw e;
      }

      if (status === 401 || /invalid.*api.*key|auth/i.test(msg)) {
        const e: any = new Error('AUTH_ERROR');
        e.code = 'AUTH_ERROR';
        e.raw = msg;
        throw e;
      }

      const err: any = new Error(msg);
      err.code = 'API_ERROR';
      err.status = status;
      err.raw = JSON.stringify(json).slice(0, 1000);
      throw err;
    }

    // Handle empty responses
    if (!text?.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }

    return parseAndNormalizeLLMTextOrThrow(text);
  } catch (err: any) {
    // Pass through known errors
    if (err.code) throw err;

    // Wrap unknown errors
    const wrapped: any = new Error(err.message || 'OpenAI error');
    wrapped.code = 'UNEXPECTED_ERROR';
    wrapped.raw = err.raw || String(err);
    throw wrapped;
  }
}