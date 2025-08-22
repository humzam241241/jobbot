import "server-only";
import { ProfileSchema, type Profile } from "@/lib/schemas/profile";
import { PROFILE_NORMALIZER_SYSTEM_PROMPT, createProfileNormalizerPrompt } from "@/lib/prompts/normalizers";
import { callJSON, LlmJsonError, JsonSchema } from "@/lib/llm/json";

/**
 * Error class for profile polishing failures
 */
export class ProfilePolishError extends Error {
  code: string;
  meta: Record<string, any>;

  constructor(code: string, meta: Record<string, any> = {}) {
    super(`Profile polish error: ${code}`);
    this.name = "ProfilePolishError";
    this.code = code;
    this.meta = meta;
  }
}

/**
 * Polishes a profile using LLM if available
 * @param rawText The original raw text from the resume
 * @param partialProfile The partially extracted profile
 * @returns A polished profile
 * @throws ProfilePolishError if JSON parsing fails
 */
export async function polishProfile(
  rawText: string,
  partialProfile: Partial<Profile>
): Promise<Profile> {
  try {
    // Check if we have an LLM key available
    const hasLlmKey = checkForLlmKey();
    
    if (hasLlmKey) {
      try {
        // Call LLM to polish the profile using JSON schema
        const polishedProfile = await callLlmForPolishing(rawText, partialProfile);
        
        // Merge the polished profile with the original
        const mergedProfile = {
          ...partialProfile,
          ...polishedProfile
        };
        
        // Validate with Zod schema
        const result = ProfileSchema.safeParse(mergedProfile);
        if (result.success) {
          return result.data;
        }
      } catch (error) {
        // If it's a JSON parsing error, rethrow with more context
        if (error instanceof LlmJsonError) {
          throw new ProfilePolishError("POLISH_JSON_PARSE_FAILED", {
            provider: error.meta.provider,
            model: error.meta.model,
            preview: error.meta.preview
          });
        }
        
        // Log other errors but continue with fallback
        console.error("Error in LLM profile polishing:", error);
      }
    }
    
    // If LLM is not available or validation failed, use the original profile
    const result = ProfileSchema.safeParse(partialProfile);
    if (result.success) {
      return result.data;
    }
    
    // If validation fails, try to fix the profile
    const fixedProfile = fixProfileForValidation(partialProfile);
    return fixedProfile;
  } catch (error) {
    // If it's our typed error, rethrow it
    if (error instanceof ProfilePolishError) {
      throw error;
    }
    
    console.error("Error polishing profile:", error);
    
    // Return the original profile after fixing validation issues
    const fixedProfile = fixProfileForValidation(partialProfile);
    return fixedProfile;
  }
}

/**
 * Checks if an LLM API key is available
 * @returns True if an LLM key is available
 */
function checkForLlmKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY
  );
}

/**
 * Calls the LLM to polish the profile using JSON schema
 * @param rawText The original raw text from the resume
 * @param partialProfile The partially extracted profile
 * @returns A polished profile
 */
async function callLlmForPolishing(
  rawText: string,
  partialProfile: Partial<Profile>
): Promise<Partial<Profile>> {
  // Create a schema that mirrors ProfileSchema
  const profileJsonSchema: JsonSchema<Profile> = {
    name: "ProfileSchema",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        website: { type: "string" },
        location: { type: "string" },
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
              title: { type: "string" },
              company: { type: "string" },
              location: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              bullets: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["title", "company", "bullets"]
          }
        },
        education: {
          type: "array",
          items: {
            type: "object",
            properties: {
              school: { type: "string" },
              degree: { type: "string" },
              field: { type: "string" },
              startDate: { type: "string" },
              endDate: { type: "string" },
              gpa: { type: "string" }
            },
            required: ["school"]
          }
        }
      },
      required: ["name", "skills"]
    }
  };

  // Enhanced system prompt with strict instructions
  const enhancedSystemPrompt = `
${PROFILE_NORMALIZER_SYSTEM_PROMPT}

STRICT MODE: Output must be valid JSON conforming to the provided schema. Do NOT include HTML, markdown fences, or any prose outside JSON. Do NOT invent name/email/phone; do not add placeholders. Keep the original data structure.
`;

  // Create the user prompt
  const userPrompt = createProfileNormalizerPrompt(rawText, partialProfile);
  
  // Call the LLM with JSON schema
  try {
    const result = await callJSON({
      provider: "auto",
      model: "best",
      system: enhancedSystemPrompt,
      user: userPrompt,
      schema: profileJsonSchema,
      maxTokens: 1500
    });
    
    return result;
  } catch (error) {
    if (error instanceof LlmJsonError) {
      throw error; // Rethrow LlmJsonError for specific handling
    }
    
    console.error("Error calling LLM for profile polishing:", error);
    throw new ProfilePolishError("POLISH_FAILED", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Fixes a profile to ensure it passes Zod validation
 * @param profile The profile to fix
 * @returns A fixed profile that passes validation
 */
function fixProfileForValidation(profile: Partial<Profile>): Profile {
  // Ensure required fields are present
  const fixedProfile = {
    name: profile.name || "Unknown",
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    location: profile.location,
    summary: profile.summary,
    skills: profile.skills || [],
    experience: (profile.experience || []).map(exp => ({
      title: exp.title || "Position",
      company: exp.company || "Company",
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      bullets: exp.bullets || []
    })),
    education: (profile.education || []).map(edu => ({
      school: edu.school || "University",
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
      gpa: edu.gpa
    }))
  };
  
  // If there's still no experience or education, add placeholders
  if (fixedProfile.experience.length === 0) {
    fixedProfile.experience = [];
  }
  
  if (fixedProfile.education.length === 0) {
    fixedProfile.education = [];
  }
  
  // Final validation
  const result = ProfileSchema.safeParse(fixedProfile);
  if (result.success) {
    return result.data;
  }
  
  // If still failing, create a minimal valid profile
  return {
    name: profile.name || "Unknown",
    skills: [],
    experience: [],
    education: []
  };
}