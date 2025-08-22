// apps/web/lib/generators/tailorCoverLetter.ts
import { resolveProvider } from '../llm/providers';
import { callJSON } from '../llm/json';
import { CoverLetterSchema } from '../schemas/resume';
import { parseWithSchema } from '../json/extract';
import { generateWithGoogle } from '../ai/generateWithGoogle';

export type CoverLetter = {
  header: { 
    applicant: string; 
    contact: string; 
    date: string 
  };
  employer: { 
    name?: string; 
    address?: string 
  };
  greeting: string;
  body: string[]; // paragraphs
  closing: string;
  signature: string; // applicant name
};

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedTokens?: number;
}

/**
 * Tailors a cover letter based on applicant profile, tailored resume, and job description
 * @param options Options for tailoring
 * @returns The tailored cover letter with provider info
 * @throws Error if JSON parsing fails or no providers are available
 */
export async function tailorCoverLetter({
  requested,
  applicantProfile,
  tailoredResume,
  jobDescription
}: { 
  requested?: { provider?: 'openai' | 'anthropic' | 'google'; model?: string },
  applicantProfile: any, 
  tailoredResume: any, 
  jobDescription: string
}): Promise<{ 
  result: CoverLetter, 
  provider: string, 
  model: string,
  tokenUsage?: TokenUsage 
}> {
  let { provider, model } = resolveProvider({ requested, purpose: 'cover-letter' });
  
  const schema = {
    type: "object",
    properties: {
      header: {
        type: "object",
        properties: {
          applicant: { type: "string" },
          contact: { type: "string" },
          date: { type: "string" }
        },
        required: ["applicant", "contact", "date"]
      },
      employer: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" }
        }
      },
      greeting: { type: "string" },
      body: {
        type: "array",
        items: { type: "string" }
      },
      closing: { type: "string" },
      signature: { type: "string" }
    },
    required: ["header", "greeting", "body", "closing", "signature"]
  } as any;
  
  const systemPrompt = `You produce business English, concise, one page, direct impact bullets only when necessary, match company tone from JD, and never invent facts.

Your task is to create a professional cover letter that:
1. Is concise and fits on one page
2. Uses business English appropriate for the industry
3. Matches the company tone from the job description
4. NEVER invents facts about the applicant
5. Uses a 3-part structure: hook (2-3 lines), 2 skill paragraphs tailored to job requirements, close + availability
6. Only references skills and experiences that are actually in the resume`;

  const userPrompt = `Write a concise, professional cover letter that adapts to ANY industry by referencing BOTH:
1) The applicant profile derived from their resume, and
2) The tailored resume content created for this JD.

Rules:
- No placeholders like "John Doe" or fake companies.
- Use the applicant's real name/contact from applicantProfile.
- Use employer name if present in JD; otherwise leave employer.name blank.
- Body paragraphs must reference concrete evidence from tailoredResume (achievements, skills, projects) mapped to JD requirements.
- Keep tone professional, impact-driven, and specific.
- If a fact is missing from the resume, write a neutral line rather than inventing details.

Inputs:
- applicantProfile JSON: ${JSON.stringify(applicantProfile)}
- tailoredResume JSON: ${JSON.stringify(tailoredResume)}
- jobDescription (text): ${jobDescription}

Output:
Return a single JSON object matching the CoverLetter schema (header, employer, greeting, body[], closing, signature).`;

  try {
    // Special handling for Google provider
    if (provider === 'google') {
      const response = await generateWithGoogle({
        system: systemPrompt,
        user: userPrompt,
        model,
        jsonSchema: schema
      });
      
      const parsed = parseWithSchema(CoverLetterSchema, response.text);
      
      if (!parsed.ok) {
        const error = new Error(`Failed to parse Google response: ${parsed.error}`);
        (error as any).code = 'GOOGLE_JSON_PARSE_ERROR';
        (error as any).preview = response.text.slice(0, 500);
        (error as any).provider = 'google';
        (error as any).model = model;
        throw error;
      }
      
      return {
        result: parsed.data as CoverLetter,
        provider: 'google',
        model,
        tokenUsage: response.usage
      };
    }
    
    // Standard flow for OpenAI and Anthropic
    const { json, provider: usedProvider, model: usedModel, tokenUsage } = await callJSON<CoverLetter>({ 
      provider, 
      model, 
      schema, 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    
    return { 
      result: json, 
      provider: usedProvider, 
      model: usedModel,
      tokenUsage
    };
  } catch (e: any) {
    // Retry with fallback provider if missing key is detected upstream; otherwise bubble
    if (e.message?.includes('API key') || e.code?.includes('API_ERROR')) {
      console.warn(`Provider ${provider} failed, trying fallback`);
      
      // Try with fallback providers in sequence
      const fallbackProviders = ['openai', 'anthropic', 'google'].filter(p => p !== provider);
      
      for (const fallbackProvider of fallbackProviders) {
        try {
          const fb = resolveProvider({ 
            requested: { provider: fallbackProvider as any }, 
            purpose: 'cover-letter' 
          });
          
          if (fb.provider === 'google') {
            const response = await generateWithGoogle({
              system: systemPrompt,
              user: userPrompt,
              model: fb.model,
              jsonSchema: schema
            });
            
            const parsed = parseWithSchema(CoverLetterSchema, response.text);
            
            if (!parsed.ok) continue; // Try next provider if parsing fails
            
            return {
              result: parsed.data as CoverLetter,
              provider: 'google',
              model: fb.model,
              tokenUsage: response.usage
            };
          } else {
            const { json, provider: fbProvider, model: fbModel, tokenUsage } = await callJSON<CoverLetter>({ 
              provider: fb.provider, 
              model: fb.model, 
              schema, 
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            });
            
            return { 
              result: json, 
              provider: fbProvider, 
              model: fbModel,
              tokenUsage
            };
          }
        } catch (fbError) {
          // Continue to next fallback provider
          console.warn(`Fallback provider ${fallbackProvider} also failed`);
        }
      }
    }
    
    // Add provider info to error
    if (e.provider === undefined) {
      e.provider = provider;
      e.model = model;
    }
    
    // Re-throw the error if all fallbacks failed
    throw e;
  }
}
