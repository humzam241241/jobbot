// apps/web/lib/generators/tailorResume.ts
import { resolveProvider } from '../llm/providers';
import { callJSON } from '../llm/json';
import { ResumeSchema } from '../schemas/resume';
import { parseWithSchema } from '../json/extract';
import { generateWithGoogle } from '../ai/generateWithGoogle';

export type TailoredResume = {
  summary: string;
  skills: string[]; // preserve existing grouping; just updated terms
  experience: Array<{ 
    company: string; 
    role: string; 
    start?: string; 
    end?: string; 
    bullets: string[] 
  }>;
  education: Array<{ 
    school: string; 
    degree: string; 
    dates?: string; 
    details?: string[] 
  }>;
  projects: Array<{ 
    name: string; 
    bullets: string[] 
  }>;
};

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedTokens?: number;
}

/**
 * Tailors a resume based on a job description using LLM
 * @param options Options for tailoring
 * @returns The tailored resume content with provider info
 * @throws Error if JSON parsing fails or no providers are available
 */
export async function tailorResume({ 
  requested, 
  masterResume, 
  jobDescription,
  preserveFormat = true
}: {
  requested?: { provider?: 'openai' | 'anthropic' | 'google'; model?: string };
  masterResume: TailoredResume; // parsed from user's original resume structure
  jobDescription: string;
  preserveFormat?: boolean;
}): Promise<{ 
  result: TailoredResume, 
  provider: string, 
  model: string,
  tokenUsage?: TokenUsage 
}> {
  let { provider, model } = resolveProvider({ requested, purpose: 'resume-tailor' });
  
  const schema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      skills: { 
        type: "array", 
        items: { type: "string" } 
      },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            start: { type: "string" },
            end: { type: "string" },
            bullets: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          required: ["company", "role", "bullets"]
        }
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            school: { type: "string" },
            degree: { type: "string" },
            dates: { type: "string" },
            details: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          required: ["school", "degree"]
        }
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            bullets: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          required: ["name", "bullets"]
        }
      }
    },
    required: ["summary", "skills", "experience", "education", "projects"]
  } as any;
  
  const preserveFormatText = preserveFormat 
    ? `STRICT FORMAT PRESERVATION: It is critical that you maintain the exact structure of the original resume.
- Keep the exact same number of bullet points per experience/project
- Maintain the original section order and structure
- Do not add or remove any sections or fields
- Only modify the content of existing fields to better match the job description`
    : '';
  
  const systemPrompt = `You are an expert resume tailoring assistant that helps job seekers optimize their resumes for specific job descriptions.

${preserveFormatText}

Your task is to tailor the provided resume to better match the job description while preserving the original resume structure.`;

  const userPrompt = `Task: Tailor the user's resume content to the job description.

Constraints:
- Keep the exact section order present in masterResume (Summary, Skills, Experience, Education, Projects).
- Do NOT change headings or layout.
- Only update the TEXT inside fields (summary wording, bullets).
- Respect original contact info and fixed facts (name, email, phone, degree, GPA).

Inputs:
- masterResume (JSON): ${JSON.stringify(masterResume)}
- jobDescription (text): ${jobDescription}

Output:
Return a JSON object conforming to the TailoredResume schema.`;
  
  try {
    // Special handling for Google provider
    if (provider === 'google') {
      const response = await generateWithGoogle({
        system: systemPrompt,
        user: userPrompt,
        model,
        jsonSchema: schema
      });
      
      const parsed = parseWithSchema(ResumeSchema, response.text);
      
      if (!parsed.ok) {
        const error = new Error(`Failed to parse Google response: ${parsed.error}`);
        (error as any).code = 'GOOGLE_JSON_PARSE_ERROR';
        (error as any).preview = response.text.slice(0, 500);
        (error as any).provider = 'google';
        (error as any).model = model;
        throw error;
      }
      
      return {
        result: parsed.data as TailoredResume,
        provider: 'google',
        model,
        tokenUsage: response.usage
      };
    }
    
    // Standard flow for OpenAI and Anthropic
    const { json, provider: usedProvider, model: usedModel, tokenUsage } = await callJSON<TailoredResume>({ 
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
            purpose: 'resume-tailor' 
          });
          
          if (fb.provider === 'google') {
            const response = await generateWithGoogle({
              system: systemPrompt,
              user: userPrompt,
              model: fb.model,
              jsonSchema: schema
            });
            
            const parsed = parseWithSchema(ResumeSchema, response.text);
            
            if (!parsed.ok) continue; // Try next provider if parsing fails
            
            return {
              result: parsed.data as TailoredResume,
              provider: 'google',
              model: fb.model,
              tokenUsage: response.usage
            };
          } else {
            const { json, provider: fbProvider, model: fbModel, tokenUsage } = await callJSON<TailoredResume>({ 
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