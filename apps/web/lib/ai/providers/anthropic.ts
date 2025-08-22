import Anthropic from '@anthropic-ai/sdk';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '../capabilities';

export async function anthropicTailorResume({ apiKey, model, system, user }: { apiKey: string; model?: string; system: string; user: string; }): Promise<TailorResponseT> {
  const client = new Anthropic({ apiKey });
  const mdl = model || ProviderDefaultModels.anthropic;

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

  const enhancedSystem = `${system}\n\n${jsonStructure}\n\nReturn ONLY the JSON object, no additional text.`;
  const enhancedUser = `${user}\n\nReturn ONLY a JSON object matching the specified structure.`;

  try {
    // Basic request without response_format
    const msg = await client.messages.create({
      model: mdl,
      max_tokens: 4000,
      temperature: 0.2,
      system: enhancedSystem,
      messages: [{ role: 'user', content: enhancedUser }],
    });

    const text = msg.content?.[0]?.type === 'text' ? msg.content[0].text : '';
    if (!text?.trim()) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }

    // Extract JSON and normalize
    const json = extractFirstJson(text);
    if (!json) {
      const e: any = new Error('JSON_PARSE_ERROR');
      e.code = 'JSON_PARSE_ERROR';
      e.preview = text.slice(0, 200);
      throw e;
    }

    return normalizeTailorJson(JSON.parse(json));
  } catch (err: any) {
    // Handle Anthropic specific errors
    if (err.status === 401) {
      const e: any = new Error('AUTH_ERROR');
      e.code = 'AUTH_ERROR';
      e.raw = err.message;
      throw e;
    }

    if (err.status === 404) {
      const e: any = new Error('MODEL_NOT_FOUND');
      e.code = 'MODEL_NOT_FOUND';
      e.hint = `Requested "${model}", using "${mdl}" for Anthropic.`;
      throw e;
    }

    // Pass through known errors
    if (err.code) throw err;

    // Wrap unknown errors
    const wrapped: any = new Error(err.message || 'Anthropic error');
    wrapped.code = 'UNEXPECTED_ERROR';
    wrapped.raw = err.raw || String(err);
    throw wrapped;
  }
}