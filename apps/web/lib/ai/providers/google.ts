import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { createLogger } from '@/lib/logger';

const logger = createLogger('google-provider');

const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Accepts { model, jobDescription, resumeMarkdown, temperature, maxTokens }
export async function googleRewrite(args: {
  model?: string;
  jobDescription: string;
  resumeMarkdown: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const modelId = args.model ?? "gemini-2.5-pro";
  try {
    logger.info('Initializing Google model', { modelId });
    
    const model = genai.getGenerativeModel({
      model: modelId,
    });

    const prompt = `You are an expert resume writer and technical recruiter at a fast-growing startup. Your task is to optimize the following resume for the provided job description.
Keep the resume ATS-friendly and under one page. Focus on results, impact, and clarity.

Rules:
1. Focus on results, impact, and clarity
2. Turn personal projects into business-value statements
3. Use action verbs, measurable outcomes, and correct industry terminology
4. Highlight transferable skills from non-tech experience when relevant
5. Preserve EXACT section structure and headings from the original (do not add new sections)
6. Keep it ATS-friendly and concise (<= 1 page when rendered)
7. Return ONLY a JSON object with the exact structure shown below, no other text

Job Description:
${args.jobDescription}

Original Resume:
${args.resumeMarkdown}

You must respond with ONLY a JSON object in this exact format (no markdown fencing or other text):
{
  "summary": "Brief professional summary",
  "experience": [
    {
      "company": "Company name",
      "role": "Role title",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "Project name",
      "bullets": ["Key achievement 1", "Key achievement 2"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "coverLetter": "Full cover letter text that matches the job description and highlights key qualifications"
}`;

    logger.info('Sending request to Google', { 
      promptLength: prompt.length,
      temperature: args.temperature,
      maxTokens: args.maxTokens
    });

    const result = await withBackoff(() =>
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: args.temperature ?? 0.2,
          maxOutputTokens: args.maxTokens ?? 2000,
          topK: 40,
          topP: 0.8,
        },
      })
    );

    const text = result.response?.text?.() ?? "";
    if (!text) {
      logger.error('No content received from Google');
      throw new Error("NO_CONTENT_FROM_GOOGLE");
    }

    // Try to extract JSON from response
    let jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON found in response', { text: text.slice(0, 100) + '...' });
      throw new Error("NO_JSON_IN_RESPONSE");
    }

    // Try to parse as JSON to validate
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.summary || !parsed.experience) {
        logger.error('Invalid JSON structure', { parsed });
        throw new Error("Invalid JSON structure");
      }
      
      logger.info('Successfully parsed response', {
        sections: Object.keys(parsed),
        summaryLength: parsed.summary.length,
        experienceCount: parsed.experience.length
      });
    } catch (e) {
      logger.error('Failed to parse Google response as JSON', { 
        error: e,
        text: jsonMatch[0].slice(0, 100) + '...'
      });
      throw new Error("INVALID_JSON_FROM_GOOGLE");
    }

    logger.info('Successfully generated content', { 
      responseLength: text.length,
      jsonLength: jsonMatch[0].length,
      modelId 
    });

    return { 
      ok: true as const, 
      content: jsonMatch[0], 
      modelUsed: modelId, 
      providerUsed: "google" 
    };
  } catch (e: any) {
    logger.error('Google generation failed', {
      error: {
        message: e.message,
        code: e.code,
        status: e.status,
        details: e.details
      }
    });

    return {
      ok: false as const,
      error: {
        code: String(e?.status ?? e?.code ?? "GOOGLE_ERROR"),
        message: e?.message || "Google (Gemini) request failed.",
        raw: {
          message: e.message,
          code: e.code,
          status: e.status,
          details: e.details
        },
      },
    };
  }
}