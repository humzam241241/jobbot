// apps/web/lib/ai/providers/anthropic.ts
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';

export async function anthropicTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,  // e.g., "claude-3-5-sonnet-latest"
      max_tokens: 2000,
      system: TAILOR_RESUME_SYSTEM,
      messages: [
        { role: 'user', content: [
          { type: 'text', text: '--- ORIGINAL RESUME ---\n' + resumeText },
          { type: 'text', text: '--- JOB DESCRIPTION ---\n' + jobDescription },
        ]},
      ],
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error('Anthropic error');
    err.status = res.status;
    err.body = JSON.stringify(json).slice(0, 800);
    throw err;
  }

  const text = json?.content?.[0]?.text ?? '';
  return parseAndNormalizeLLMTextOrThrow(text);
}