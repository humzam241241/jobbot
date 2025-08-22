import OpenAI from "openai";
import type { AIProvider, AIModel, AIResponse } from "../types";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  name = "OpenAI";
  models: AIModel[] = ["gpt-4o", "gpt-4o-mini"];

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  private async complete(prompt: string, model: AIModel): Promise<AIResponse> {
    const modelId = model === "gpt-4o" ? "gpt-4" : "gpt-4-turbo-preview";
    
    const completion = await this.client.chat.completions.create({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000
    });

    return {
      text: completion.choices[0].message.content || "",
      model: modelId,
      provider: this.name
    };
  }

  async generateResume(text: string, jd: string, model: AIModel): Promise<string> {
    const prompt = `You are an expert resume writer. Tailor this resume to match the job description, while keeping all information truthful and verifiable. Only use information present in the original resume.

Original Resume:
${text}

Job Description:
${jd}

Instructions:
1. Keep the same basic structure and sections
2. Rewrite bullets to emphasize relevant skills and experiences
3. Use keywords from the job description where they match the original content
4. Do not invent or fabricate any information
5. Focus on quantifiable achievements
6. Use active voice and strong verbs
7. Return ONLY the tailored resume text, no comments or explanations

Tailored Resume:`;

    const response = await this.complete(prompt, model);
    return response.text;
  }

  async generateCoverLetter(text: string, jd: string, model: AIModel): Promise<string> {
    const prompt = `You are an expert cover letter writer. Write a cover letter based on this resume and job description. Only use information that appears in the resume - do not fabricate or embellish.

Resume:
${text}

Job Description:
${jd}

Instructions:
1. Use a professional business letter format
2. Focus on specific, verifiable achievements from the resume
3. Connect resume experiences to job requirements
4. Keep it concise - no more than 3-4 paragraphs
5. Use formal but natural language
6. Do not invent or fabricate any information
7. Return ONLY the cover letter text, no comments or explanations

Cover Letter:`;

    const response = await this.complete(prompt, model);
    return response.text;
  }
}