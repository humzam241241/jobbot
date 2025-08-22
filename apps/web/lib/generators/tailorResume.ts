// apps/web/lib/generators/tailorResume.ts
import { resolveProvider } from '../llm/providers';
import { callJSON } from '../llm/json';

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

/**
 * Tailors a resume based on a job description using LLM
 * @param options Options for tailoring
 * @returns The tailored resume content with provider info
 * @throws Error if JSON parsing fails or no providers are available
 */
export async function tailorResume({ 
  requested, 
  masterResume, 
  jobDescription 
}: {
  requested?: { provider?: 'openai' | 'anthropic' | 'gemini'; model?: string };
  masterResume: TailoredResume; // parsed from user's original resume structure
  jobDescription: string;
}): Promise<{ result: TailoredResume, provider: string, model: string }> {
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
  
  const messages = [
    { 
      role: 'user' as const, 
      content: `Task: Tailor the user's resume content to the job description while PRESERVING the original resume structure and section ordering.

Constraints:
- Keep the exact section order present in masterResume (Summary, Skills, Experience, Education, Projects).
- Do NOT change headings or layout.
- Only update the TEXT inside fields (summary wording, bullets).
- Respect original contact info and fixed facts (name, email, phone, degree, GPA).

Inputs:
- masterResume (JSON): ${JSON.stringify(masterResume)}
- jobDescription (text): ${jobDescription}

Output:
Return a JSON object conforming to the TailoredResume schema.`
    }
  ];
  
  try {
    const { json, provider: usedProvider, model: usedModel } = await callJSON<TailoredResume>({ 
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
      const fb = resolveProvider({ requested: { provider: 'openai' }, purpose: 'resume-tailor' });
      
      try {
        const { json, provider: fbProvider, model: fbModel } = await callJSON<TailoredResume>({ 
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
        const fb2 = resolveProvider({ requested: { provider: 'anthropic' }, purpose: 'resume-tailor' });
        
        const { json, provider: fb2Provider, model: fb2Model } = await callJSON<TailoredResume>({ 
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