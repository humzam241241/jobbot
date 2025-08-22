import Anthropic from '@anthropic-ai/sdk';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels, supportsJsonSchema } from '../capabilities';

export async function anthropicTailorResume({ apiKey, model, system, user }: { apiKey: string; model?: string; system: string; user: string; }): Promise<TailorResponseT> {
  const client = new Anthropic({ apiKey });
  const mdl = model || ProviderDefaultModels.anthropic;

  const common = {
    model: mdl,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  } as const;

  if (supportsJsonSchema('anthropic', mdl)) {
    // Minimal hand-written schema for Claude 3.7+
    const resp = await client.messages.create({
      ...common,
      response_format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            tailoredResume: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                contact: { type: 'object' },
                summary: { type: 'string' },
                skills: { type: 'array' },
                experience: { type: 'array' },
                education: { type: 'array' },
                projects: { type: 'array' },
              },
              required: ['name', 'summary', 'skills', 'experience']
            },
            coverLetter: { type: 'string' }
          },
          required: ['tailoredResume', 'coverLetter']
        }
      },
    });

    const text = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
    const json = extractFirstJson(text) ?? text;
    return normalizeTailorJson(JSON.parse(json));
  }

  // Fallback: no response_format
  const resp = await client.messages.create({ ...common });
  const text = resp.content?.[0]?.type === 'text' ? resp.content[0].text : '';
  const json = extractFirstJson(text) ?? text;
  return normalizeTailorJson(JSON.parse(json));
}