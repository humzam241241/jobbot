import OpenAI from 'openai';
import { retryWithBackoff as withBackoff } from "@/lib/utils/retry";
import { createLogger } from '@/lib/logger';

const logger = createLogger('openrouter-provider');

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Accepts { model, jobDescription, resumeMarkdown, temperature, maxTokens }
export async function openrouterRewrite(args: {
  model?: string;
  jobDescription: string;
  resumeMarkdown: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const modelId = args.model ?? "anthropic/claude-3-opus";
  try {
    logger.info('Initializing OpenRouter request', { modelId });

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

    logger.info('Sending request to OpenRouter', { 
      promptLength: prompt.length,
      temperature: args.temperature,
      maxTokens: args.maxTokens
    });

    const result = await withBackoff(() =>
      client.chat.completions.create({
        model: modelId,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: args.temperature ?? 0.2,
        max_tokens: args.maxTokens ?? 2000,
        response_format: { type: "json_object" }
      })
    );

    const text = result.choices[0]?.message?.content ?? "";
    if (!text) {
      logger.error('No content received from OpenRouter');
      throw new Error("NO_CONTENT_FROM_OPENROUTER");
    }

    // Try to parse as JSON to validate
    try {
      const parsed = JSON.parse(text);
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
      logger.error('Failed to parse OpenRouter response as JSON', { 
        error: e,
        text: text.slice(0, 100) + '...'
      });
      throw new Error("INVALID_JSON_FROM_OPENROUTER");
    }

    logger.info('Successfully generated content', { 
      responseLength: text.length,
      modelId 
    });

    return { 
      ok: true as const, 
      content: text, 
      modelUsed: modelId, 
      providerUsed: "openrouter" 
    };
  } catch (e: any) {
    logger.error('OpenRouter generation failed', {
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
        code: String(e?.status ?? e?.code ?? "OPENROUTER_ERROR"),
        message: e?.message || "OpenRouter request failed.",
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