import OpenAI from 'openai';

export type ProviderName = 'deepseek' | 'openrouter' | 'hf';

export interface GenerateArgs {
  resumeText: string;
  jobText: string;
}

export interface GenerateResult {
  resume_md: string;
  cover_letter_md: string;
}

const TEMPLATE_INSTRUCTIONS = `
You are an expert technical recruiter and professional resume writer.
Given:
1) RAW_RESUME (freeform text)
2) JOB_POSTING (freeform text)

Return a **strict JSON** object with keys:
- "resume_md": a **1-page** ATS-optimized resume in Markdown. Use concise bullet points with quantified impact. Keep it to ~450-600 words and prioritize the most relevant roles, skills, and keywords from the job posting. No contact info beyond "Name | City, Province | Email | Phone | LinkedIn". Use strong action verbs.
- "cover_letter_md": a **1-page** cover letter in Markdown. 3-5 short paragraphs. Show motivation + fit, mirror key requirements, and map prior wins to the role. Keep to ~250-350 words.

Rules:
- Aggressively align keywords/skills from JOB_POSTING while remaining truthful to RAW_RESUME.
- If metrics exist in RAW_RESUME, surface them; otherwise keep claims modest.
- Be specific and avoid fluff.
- DO NOT include backticks or code fences. DO NOT include any keys other than the two above.
`;

function buildMessages(resumeText: string, jobText: string) {
  return [
    { role: 'system', content: TEMPLATE_INSTRUCTIONS },
    { role: 'user', content: `RAW_RESUME:\n${resumeText}\n\nJOB_POSTING:\n${jobText}\n\nReturn JSON now.` }
  ] as OpenAI.Chat.ChatCompletionMessageParam[];
}

export async function generateWithProvider(provider: ProviderName, args: GenerateArgs): Promise<GenerateResult> {
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'deepseek-chat';

  if (!apiKey || !baseURL) {
    throw new Error('AI_API_KEY and AI_BASE_URL must be set.');
  }

  // All providers here use the OpenAI-compatible protocol (OpenRouter + DeepSeek do; HF here proxied via OpenAI SDK to simple text-gen endpoints).
  const client = new OpenAI({ apiKey, baseURL });

  const messages = buildMessages(args.resumeText, args.jobText);
  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const content = resp.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    if (!parsed.resume_md || !parsed.cover_letter_md) {
      throw new Error('Model did not return the required keys.');
    }
    return parsed as GenerateResult;
  } catch (e) {
    // Fallback: try to salvage JSON substring
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed as GenerateResult;
    }
    throw e;
  }
}
