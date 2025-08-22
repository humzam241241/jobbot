import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractFirstJson } from '@/lib/json/extract';
import { normalizeTailorJson, TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '../capabilities';

export async function googleTailorResume({ apiKey, model, prompt }: { apiKey: string; model?: string; prompt: string; }): Promise<TailorResponseT> {
  const client = new GoogleGenerativeAI(apiKey);
  const mdl = model || ProviderDefaultModels.google;

  const gen = client.getGenerativeModel({ model: mdl });
  
  // Add explicit JSON instruction to the prompt
  const jsonPrompt = prompt + '\n\nIMPORTANT: Return your response as a valid JSON object with this exact shape:\n{' +
    '"tailoredResume": {' +
    '  "name": string,' +
    '  "contact": { "email": string, "phone"?: string, "location"?: string, "linkedin"?: string, "github"?: string },' +
    '  "summary": string,' +
    '  "skills": string[],' +
    '  "experience": [{ "company": string, "role": string, "location"?: string, "dates"?: string, "bullets": string[] }],' +
    '  "projects": [{ "name": string, "tech"?: string[], "bullets": string[] }],' +
    '  "education": [{ "school": string, "degree"?: string, "dates"?: string }]' +
    '},' +
    '"coverLetter": string' +
    '}\n';

  try {
    const result = await gen.generateContent({
      contents: [{ role: 'user', parts: [{ text: jsonPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
      }
    });

    const text = result.response.text();
    if (!text?.trim()) {
      throw new Error('Empty response from model');
    }

    // Extract JSON from response
    const json = extractFirstJson(text);
    if (!json) {
      throw new Error('No valid JSON found in response');
    }

    // Parse and validate
    return normalizeTailorJson(JSON.parse(json));
  } catch (err: any) {
    if (err.message?.includes('Empty response') || err.message?.includes('No valid JSON')) {
      const e: any = new Error('MODEL_EMPTY_OUTPUT');
      e.code = 'MODEL_EMPTY_OUTPUT';
      throw e;
    }
    throw err;
  }
}