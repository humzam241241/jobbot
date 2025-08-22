import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '../capabilities';

export async function googleTailorResume({ apiKey, model, prompt }: { apiKey: string; model?: string; prompt: string; }): Promise<TailorResponseT> {
  const client = new GoogleGenerativeAI(apiKey);
  const mdl = model || ProviderDefaultModels.google;

  const gen = client.getGenerativeModel({ model: mdl });
  const res = await gen.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const text = res.response.text();
  const json = extractFirstJson(text) ?? text;
  return normalizeTailorJson(JSON.parse(json));
}