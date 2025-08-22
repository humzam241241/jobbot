import OpenAI from 'openai';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';
import { pickModel } from '@/lib/ai/modelMap';

export async function openaiTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model?: string; }): Promise<TailoredResume> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw Object.assign(new Error('Missing OPENAI_API_KEY'), { code: 'CONFIG_MISSING' });

  const finalModel = pickModel('openai', model);
  const client = new OpenAI({ apiKey: key });

  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  const system = TAILOR_RESUME_SYSTEM;
  const user = [
    '--- ORIGINAL RESUME ---', rez,
    '',
    '--- JOB DESCRIPTION ---', jd,
    '',
    'Return ONLY valid JSON (no prose) with the required shape.',
  ].join('\n');

  try {
    const r = await client.chat.completions.create({
      model: finalModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Safer than json_schema; let our parser validate.
      response_format: { type: 'json_object' },
    });

    const text = r.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }
    return parseAndNormalizeLLMTextOrThrow(text);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const status = err?.status;

    if (status === 404 && /model .* does not exist/i.test(msg)) {
      const e: any = new Error('MODEL_NOT_FOUND');
      e.code = 'MODEL_NOT_FOUND';
      e.hint = `Requested "${model}", using "${finalModel}" for OpenAI.`;
      throw e;
    }
    throw err;
  }
}