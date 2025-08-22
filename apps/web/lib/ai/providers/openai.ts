// apps/web/lib/ai/providers/openai.ts
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';

export async function openaiTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model: string; }): Promise<TailoredResume> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  // Minimal fetch using Chat Completions (works for GPT-4o/4.1 etc. if enabled)
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
          '--- ORIGINAL RESUME ---\n' + resumeText,
          '--- JOB DESCRIPTION ---\n' + jobDescription,
        ].join('\n\n') }
      ],
      temperature: 0.3,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error('OpenAI error');
    err.status = res.status;
    err.body = JSON.stringify(json).slice(0, 800);
    throw err;
  }

  const text = json?.choices?.[0]?.message?.content ?? '';
  return parseAndNormalizeLLMTextOrThrow(text);
}