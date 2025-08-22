import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIModel, AIResponse } from "../types";

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  
  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
  }

  name = "Google";
  models: AIModel[] = ["gemini-1.5-pro", "gemini-1.5-flash"];

  async isAvailable(): Promise<boolean> {
    return !!process.env.GOOGLE_API_KEY;
  }

  private async complete(prompt: string, model: AIModel): Promise<AIResponse> {
    const modelId = model === "gemini-1.5-pro" ? "gemini-1.5-pro" : "gemini-1.5-flash";
    const genModel = this.client.getGenerativeModel({ model: modelId });

    const result = await genModel.generateContent(prompt);
    const response = result.response;
    
    return {
      text: response.text(),
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
