import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIAdapter, GenArgs, GenResult } from "./types";
import { env } from "@/lib/env";

export const GeminiAdapter: AIAdapter = {
  name: "google",
  canUse() { 
    console.log(`[GeminiAdapter] Checking API key: ${!!env.googleKey ? 'Found' : 'Not found'}`);
    return !!env.googleKey; 
  },
  normalizeModel(m?: string) {
    const wanted = (m || "gemini-1.5-pro-latest").toLowerCase();
    if (wanted.includes("flash")) return "gemini-1.5-flash-latest";
    return "gemini-1.5-pro-latest"; // Default to Pro
  },
  async generate({ system, user, model }: GenArgs): Promise<GenResult> {
    console.log(`[GeminiAdapter] Generating with model: ${model || 'default'}`);
    
    if (!env.googleKey) {
      console.error('[GeminiAdapter] No Google API key found in environment');
      throw new Error('Google API key is required but not found in environment variables');
    }
    
    try {
      const client = new GoogleGenerativeAI(env.googleKey as string);
      const chosen = GeminiAdapter.normalizeModel(model);
      console.log(`[GeminiAdapter] Using normalized model: ${chosen}`);
      
      const m = client.getGenerativeModel({ model: chosen });
      
      console.log(`[GeminiAdapter] Sending request to Google API`);
      const result = await m.generateContent({
        contents: [{ role: "user", parts: [{ text: user }] }],
        systemInstruction: { parts: [{ text: system }] },
      });
      
      const text = result.response.text();
      console.log(`[GeminiAdapter] Response received, length: ${text.length} chars`);
      
      // Gemini does not provide detailed token usage yet
      return { text, usage: { model: chosen, provider: "google", totalTokens: 0 } };
    } catch (error: any) {
      const msg = String(error.message || "");
      console.error(`[GeminiAdapter] Error: ${msg}`);
      
      if (msg.includes('[429')) {
         throw new Error(`Google Gemini Quota Reached: You have hit the rate limit. Please wait and try again, or check your billing details.`);
      }
      if (msg.toLowerCase().includes('api key not valid')) {
        throw new Error(`Invalid Google API Key: Please check your GOOGLE_API_KEY environment variable.`);
      }
      if (msg.toLowerCase().includes('permission denied') || msg.toLowerCase().includes('api not enabled')) {
        throw new Error(`Google API Permission Denied: Please ensure the "Generative Language API" is enabled in your Google Cloud project.`);
      }
      if (msg.toLowerCase().includes('billing')) {
        throw new Error(`Google API Billing Error: Please ensure a valid billing account is attached to your Google Cloud project.`);
      }
      // Re-throw the original error but with a more helpful prefix
      throw new Error(`Google Gemini Error: ${msg}`);
    }
  }
};
