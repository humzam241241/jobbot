// apps/web/lib/env.ts
import { z } from 'zod';

// Schema for environment validation
const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
});

// Validate environment variables
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('[ENV] Validation error:', result.error.format());
    return process.env;
  }
  
  return result.data;
}

// Log available providers in development
function logAvailableProviders() {
  if (process.env.NODE_ENV === 'development') {
    console.log('[ENV] Available AI providers:');
    console.log(`- OpenAI: ${!!process.env.OPENAI_API_KEY ? 'Available ✅' : 'Not configured ❌'}`);
    console.log(`- Anthropic: ${!!process.env.ANTHROPIC_API_KEY ? 'Available ✅' : 'Not configured ❌'}`);
    console.log(`- Google Gemini: ${!!process.env.GEMINI_API_KEY ? 'Available ✅' : 'Not configured ❌'}`);
    
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
      console.warn('[ENV] ⚠️ No AI providers are configured. Set at least one API key for full functionality.');
    }
  }
}

// Run validation and logging at module load time
const validatedEnv = validateEnv();
logAvailableProviders();

// Export validated environment
export const env = {
  // Original env variables
  nodeRuntime: "nodejs" as const,
  adminEmails: (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean),
  
  // AI provider keys
  OPENAI_API_KEY: validatedEnv.OPENAI_API_KEY || "",
  ANTHROPIC_API_KEY: validatedEnv.ANTHROPIC_API_KEY || "",
  GEMINI_API_KEY: validatedEnv.GEMINI_API_KEY || "",
  
  // Provider availability flags
  hasOpenAI: !!validatedEnv.OPENAI_API_KEY,
  hasAnthropic: !!validatedEnv.ANTHROPIC_API_KEY,
  hasGemini: !!validatedEnv.GEMINI_API_KEY,
};

// Check if any provider is available
export function hasAnyProvider(): boolean {
  return env.hasOpenAI || env.hasAnthropic || env.hasGemini;
}