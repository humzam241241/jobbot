import OpenAI from 'openai';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '../capabilities';

export async function openaiTailorResume({ apiKey, model, system, user }: { apiKey: string; model?: string; system: string; user: string; }): Promise<TailorResponseT> {
  const client = new OpenAI({ apiKey });
  const mdl = model || ProviderDefaultModels.openai;

  const r = await client.chat.completions.create({
    model: mdl,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const text = r.choices[0]?.message?.content ?? '';
  const json = extractFirstJson(text) ?? text;
  return normalizeTailorJson(JSON.parse(json));
}