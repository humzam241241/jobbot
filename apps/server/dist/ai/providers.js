"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithProvider = generateWithProvider;
const openai_1 = __importDefault(require("openai"));
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
function buildMessages(resumeText, jobText) {
    return [
        { role: 'system', content: TEMPLATE_INSTRUCTIONS },
        { role: 'user', content: `RAW_RESUME:\n${resumeText}\n\nJOB_POSTING:\n${jobText}\n\nReturn JSON now.` }
    ];
}
async function generateWithProvider(provider, args) {
    const baseURL = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'deepseek-chat';
    if (!apiKey || !baseURL) {
        throw new Error('AI_API_KEY and AI_BASE_URL must be set.');
    }
    // All providers here use the OpenAI-compatible protocol (OpenRouter + DeepSeek do; HF here proxied via OpenAI SDK to simple text-gen endpoints).
    const client = new openai_1.default({ apiKey, baseURL });
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
        return parsed;
    }
    catch (e) {
        // Fallback: try to salvage JSON substring
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return parsed;
        }
        throw e;
    }
}
