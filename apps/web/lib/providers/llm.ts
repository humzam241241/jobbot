// Simple LLM adapter that uses the existing AI providers
import "server-only";
import { getAiProvider } from "@/lib/ai";

interface CompleteOptions {
  system: string;
  user: string;
  model?: string;
}

export const llm = {
  async complete({ system, user, model = "auto" }: CompleteOptions): Promise<string> {
    try {
      const provider = getAiProvider(model);
      const prompt = `${system}\n\n${user}`;
      return await provider.generateText(prompt);
    } catch (error) {
      console.error("LLM completion error:", error);
      return "Error generating content. Please try again.";
    }
  }
};
