export function resolveModel(provider: "openai"|"anthropic"|"google", requested?: string) {
  // If a model is requested and matches the provider's pattern, use it
  if (requested) {
    if (provider === "google" && /^gemini/i.test(requested)) {
      // Map Gemini model names
      if (requested === "gemini-2.5-pro") return "gemini-pro";
      if (requested === "gemini-2.5-pro-latest") return "gemini-pro";
      return requested;
    }
    if (provider === "openai" && /^(gpt|text-davinci)/i.test(requested)) return requested;
    if (provider === "anthropic" && /^claude/i.test(requested)) return requested;
  }

  // Otherwise use provider-specific defaults
  switch (provider) {
    case "google":
      return "gemini-pro"; // Most stable model
    case "openai":
      return "gpt-4-turbo-preview"; // or gpt-4-1106-preview
    case "anthropic":
      return "claude-3-sonnet-20240229";
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}