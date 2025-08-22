// apps/web/lib/generators/tailorCoverLetter.ts
import { resolveProvider } from '../llm/providers';
import { callJSON } from '../llm/json';

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
  requested?: { provider?: 'openai' | 'anthropic' | 'gemini'; model?: string },
  applicantProfile: any, 
  tailoredResume: any, 
  jobDescription: string
}): Promise<{ result: CoverLetter, provider: string, model: string }> {
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
  
  const messages = [{
    role: 'user' as const,
    content: `Write a concise, professional cover letter that adapts to ANY industry by referencing BOTH:
1) The applicant profile derived from their resume, and
2) The tailored resume content created for this JD.

Rules:
- No placeholders like "John Doe" or fake companies.
- Use the applicant's real name/contact from applicantProfile.
- Use employer name if present in JD; otherwise leave employer.name blank.
- Body paragraphs must reference concrete evidence from tailoredResume (achievements, skills, projects) mapped to JD requirements.
- Keep tone professional, impact-driven, and specific.

Inputs:
- applicantProfile JSON: ${JSON.stringify(applicantProfile)}
- tailoredResume JSON: ${JSON.stringify(tailoredResume)}
- jobDescription (text): ${jobDescription}

Output:
Return a single JSON object matching the CoverLetter schema (header, employer, greeting, body[], closing, signature).`
  }];

  try {
    const { json, provider: usedProvider, model: usedModel } = await callJSON<CoverLetter>({ 
      provider, 
      model, 
      schema, 
      messages 
    });
    
    return { 
      result: json, 
      provider: usedProvider, 
      model: usedModel 
    };
  } catch (e: any) {
    // Retry with fallback provider if missing key is detected upstream; otherwise bubble
    if (e.message?.includes('API key') || e.code === 'GEMINI_API_ERROR') {
      console.warn(`Provider ${provider} failed, trying fallback`);
      
      // Try with OpenAI as fallback
      const fb = resolveProvider({ requested: { provider: 'openai' }, purpose: 'cover-letter' });
      
      try {
        const { json, provider: fbProvider, model: fbModel } = await callJSON<CoverLetter>({ 
          provider: fb.provider, 
          model: fb.model, 
          schema, 
          messages 
        });
        
        return { 
          result: json, 
          provider: fbProvider, 
          model: fbModel 
        };
      } catch (fbError) {
        // If OpenAI also fails, try Anthropic
        const fb2 = resolveProvider({ requested: { provider: 'anthropic' }, purpose: 'cover-letter' });
        
        const { json, provider: fb2Provider, model: fb2Model } = await callJSON<CoverLetter>({ 
          provider: fb2.provider, 
          model: fb2.model, 
          schema, 
          messages 
        });
        
        return { 
          result: json, 
          provider: fb2Provider, 
          model: fb2Model 
        };
      }
    }
    
    // Re-throw the original error if not related to API key
    throw e;
  }
}
