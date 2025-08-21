import { TailoredOutputSchema, type ResumeJSON, type TailoredOutput } from "../types";
import { logDebug } from "../trace";
// Provider-agnostic: prefer your existing AI client if present; else OpenAI
let openai: any = null;
try { const OpenAI = require("openai").default; openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); } catch {}

const SYSTEM_PROMPT = `
You are an expert ATS resume & cover letter writer.

INPUTS you will receive:
- resume_json: parsed resume with sections, bullets, and original style hints
- jd_text: job description

OBJECTIVES:
1) Tailor the resume to the JD by rephrasing, reordering, and emphasizing EXISTING content only.
   - NO fabrication of employers, roles, degrees, dates, or tools not in resume_json.
   - Preserve sections, headings, and bullet/paragraph structure.
   - Professional, concise, achievement-oriented bullets. Integrate JD keywords naturally if supported by the source.

2) Generate a one-page cover letter aligned to both the original and tailored resume and the JD.
   - Structure: greeting, intro, 1–2 short body paragraphs focusing on fit, closing, signature (use candidate name if available).
   - No claims beyond verified content.

OUTPUT: ONLY JSON matching this schema:
{
  "resume": {
    "meta"?: { "name"?: string, "email"?: string, "phone"?: string, "location"?: string, "links"?: string[] },
    "style"?: { "fontFamily"?: string, "baseFontSize"?: number, "headingScale"?: number, "bulletStyle"?: "disc"|"square"|"dash" },
    "sections": [
      {
        "id": string, "heading": string, "order": number,
        "content": [{"type":"paragraph"|"bullet"|"subheading","text":string}]
      }
    ]
  },
  "coverLetter": {
    "greeting": string,
    "intro": string,
    "body": [string],
    "closing": string,
    "signature": string
  }
}

HARD RULES:
- No free text outside of JSON.
- No "[object Object]".
- No fabrication. If JD asks for unsupported skill, acknowledge related verified skills, not false claims.
`;

export async function tailor(resume: ResumeJSON, jd: string, traceId: string): Promise<TailoredOutput> {
  const payload = { resume_json: resume, jd_text: jd };

  // Try OpenAI JSON-mode if available
  if (openai) {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.25,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) }
      ]
    });
    const text = res.choices?.[0]?.message?.content || "{}";
    try {
      const json = JSON.parse(text);
      return TailoredOutputSchema.parse(json);
    } catch (e:any) {
      logDebug(traceId,"ai","warn","Invalid JSON, retrying once",{err:e?.message});
      const res2 = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\nReturn VALID JSON ONLY conforming to the schema. No prose." },
          { role: "user", content: JSON.stringify(payload) }
        ]
      });
      const text2 = res2.choices?.[0]?.message?.content || "{}";
      const json2 = JSON.parse(text2);
      return TailoredOutputSchema.parse(json2);
    }
  }

  // If no provider configured:
  throw new Error("No AI provider configured. Set OPENAI_API_KEY.");
}
