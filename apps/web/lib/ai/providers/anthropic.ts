import Anthropic from '@anthropic-ai/sdk';
import { TAILOR_RESUME_SYSTEM } from '@/lib/ai/prompts/tailor';
import { parseAndNormalizeLLMTextOrThrow, TailoredResume } from '@/lib/generators/tailorResume';
import { compactText } from '@/lib/ai/compact';
import { pickModel } from '@/lib/ai/modelMap';

export async function anthropicTailorResume({
  jobDescription,
  resumeText,
  model,
}: { jobDescription: string; resumeText: string; model?: string; }): Promise<TailoredResume> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('Missing ANTHROPIC_API_KEY'), { code: 'CONFIG_MISSING' });

  const finalModel = pickModel('anthropic', model);
  const client = new Anthropic({ apiKey: key });

  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  const system = TAILOR_RESUME_SYSTEM + '\nReturn ONLY a JSON object. No markdown fences, no extra text.';
  const user = [
    '--- ORIGINAL RESUME ---', rez,
    '',
    '--- JOB DESCRIPTION ---', jd,
    '',
    'Output strictly valid JSON with the required keys.'
  ].join('\n');

  try {
    // Do NOT send response_format unless you know your SDK supports it; some versions 400.
    const msg = await client.messages.create({
      model: finalModel,
      max_tokens: 2000,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text = msg.content?.[0]?.type === 'text' ? msg.content[0].text : '';
    if (!text.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }
    return parseAndNormalizeLLMTextOrThrow(text);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const status = err?.status;

    if (status === 400 && /response_format/i.test(msg)) {
      const e: any = new Error('PARAM_NOT_SUPPORTED');
      e.code = 'PARAM_NOT_SUPPORTED';
      e.hint = 'Anthropic SDK does not support response_format. Removed.';
      throw e;
    }
    if (status === 404) {
      const e: any = new Error('MODEL_NOT_FOUND');
      e.code = 'MODEL_NOT_FOUND';
      e.hint = `Requested "${model}", using "${finalModel}" for Anthropic.`;
      throw e;
    }
    throw err;
  }
}