// apps/web/lib/ai/providers/anthropic.ts
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';

export async function anthropicTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw Object.assign(new Error('Missing ANTHROPIC_API_KEY'), { code: 'CONFIG_MISSING' });

  // Compact inputs to avoid token limits
  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  try {
    // Claude 3 API call
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: TAILOR_RESUME_SYSTEM,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                '--- ORIGINAL RESUME ---',
                rez,
                '',
                '--- JOB DESCRIPTION ---',
                jd
              ].join('\n')
            }
          ]
        }],
        response_format: { type: "json" } // Force JSON mode for Claude 3
      }),
    });

    const json = await res.json().catch(() => ({}));
    const text = json?.content?.[0]?.text ?? '';

    // Handle API errors
    if (!res.ok) {
      const msg = String(json?.error?.message ?? 'Anthropic error');
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
    const wrapped: any = new Error(err.message || 'Anthropic error');
    wrapped.code = 'UNEXPECTED_ERROR';
    wrapped.raw = err.raw || String(err);
    throw wrapped;
  }
}