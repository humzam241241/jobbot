import OpenAI from 'openai';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '../capabilities';

export async function openaiTailorResume({ apiKey, model, system, user }: { apiKey: string; model?: string; system: string; user: string; }): Promise<TailorResponseT> {
  const client = new OpenAI({ apiKey });
  const mdl = model || ProviderDefaultModels.openai;

  // Add JSON structure guidance
  const jsonStructure = `
Return a JSON object with EXACTLY this structure:
{
  "tailoredResume": {
    "name": string,
    "contact": {
      "email": string,
      "phone": string | null,
      "location": string | null,
      "linkedin": string | null,
      "github": string | null
    },
    "summary": string,
    "skills": string[],
    "experience": [{
      "company": string,
      "role": string,
      "location": string | null,
      "dates": string | null,
      "bullets": string[]
    }],
    "projects": [{
      "name": string,
      "tech": string[] | null,
      "bullets": string[]
    }],
    "education": [{
      "school": string,
      "degree": string | null,
      "dates": string | null
    }]
  },
  "coverLetter": string
}`;

  const enhancedSystem = `${system}\n\n${jsonStructure}\n\nEnsure all required fields are present and non-null.`;

  try {
    const r = await client.chat.completions.create({
      model: mdl,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: enhancedSystem },
        { role: 'user', content: user },
      ],
    });

    const text = r.choices[0]?.message?.content ?? '';
    if (!text.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }

    // Extract JSON and normalize
    const json = extractFirstJson(text) ?? text;
    return normalizeTailorJson(JSON.parse(json));
  } catch (err: any) {
    // Handle OpenAI specific errors
    if (err.status === 404 && /model .* does not exist/i.test(err.message)) {
      const e: any = new Error('MODEL_NOT_FOUND');
      e.code = 'MODEL_NOT_FOUND';
      e.hint = `Requested "${model}", using "${mdl}" for OpenAI.`;
      throw e;
    }

    // Pass through known errors
    if (err.code) throw err;

    // Wrap unknown errors
    const wrapped: any = new Error(err.message || 'OpenAI error');
    wrapped.code = 'UNEXPECTED_ERROR';
    wrapped.raw = err.raw || String(err);
    throw wrapped;
  }
}