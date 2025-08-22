import { googleTailorResume } from '@/lib/ai/providers/google';
import { openaiTailorResume } from '@/lib/ai/providers/openai';
import { anthropicTailorResume } from '@/lib/ai/providers/anthropic';
import { TailorResponseT } from '@/lib/schemas/resume';
import { ProviderDefaultModels } from '@/lib/ai/capabilities';
import { compactText } from '@/lib/ai/compact';

// Recruiter system prompt (verbatim)
const SYSTEM_PROMPT = `Act as a technical recruiter at a fast-growing startup. I'm going to give you a resume. I want you to tailor it so it's ATS-optimized and looks like a high-potential candidate for the job description. Focus on results, impact and clarity; turn personal projects into real business value statements; rewrite bullet points using action verbs, measurable outcomes, and industry terminology. Use numerical metrics if there are any, don't invent any information, highlight transferable skills from non-technical roles, and keep the original format of the resume. Make it one page long.

Also produce a concise cover letter based on the original resume, the new tailored resume, and the job description. Use information from the original resume to populate the new resume. Return ONLY the JSON object described by the response contract—no commentary.`;

export type Provider = 'google' | 'openai' | 'anthropic';

type TailorResumeResult = {
  ok: boolean;
  result?: TailorResponseT;
  attempts: Array<{
    provider: Provider;
    code?: string;
    status?: number;
    message: string;
    preview?: string;
  }>;
  provider?: Provider;
  lastError?: Error;
};

export async function tailorResume({
  jobDescription,
  resumeText,
  provider = 'google',
  model,
}: {
  jobDescription: string;
  resumeText: string;
  provider?: Provider;
  model?: string;
}): Promise<TailorResumeResult> {
  // Order of fallbacks if primary fails
  const providers: Provider[] = [provider];
  if (provider !== 'openai') providers.push('openai');
  if (provider !== 'anthropic') providers.push('anthropic');
  if (provider !== 'google') providers.push('google');

  const attempts: TailorResumeResult['attempts'] = [];
  let lastError: Error | undefined;

  // Compact inputs to avoid token limits
  const jd = compactText(jobDescription, 8000);
  const rez = compactText(resumeText, 16000);

  // Build the user prompt
  const userPrompt = [
    '--- ORIGINAL RESUME ---',
    rez,
    '',
    '--- JOB DESCRIPTION ---',
    jd,
    '',
    'Return an object with shape: { tailoredResume: TailoredResume, coverLetter: string } and nothing else.',
  ].join('\n');

  // Try each provider in sequence
  for (const p of providers) {
    try {
      console.log(`Attempting with provider: ${p}`);
      
      // Use the appropriate provider with its own model mapping
      let result: TailorResponseT;
      
      if (p === 'google') {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');
        
        // Google uses a single prompt
        const googlePrompt = SYSTEM_PROMPT + '\n\n' + userPrompt;
        result = await googleTailorResume({ 
          apiKey, 
          model: p === provider ? model : undefined, // Only use requested model for primary provider
          prompt: googlePrompt 
        });
      } 
      else if (p === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
        
        result = await openaiTailorResume({ 
          apiKey, 
          model: p === provider ? model : undefined,
          system: SYSTEM_PROMPT, 
          user: userPrompt 
        });
      } 
      else if (p === 'anthropic') {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
        
        result = await anthropicTailorResume({ 
          apiKey, 
          model: p === provider ? model : undefined,
          system: SYSTEM_PROMPT, 
          user: userPrompt 
        });
      }
      else {
        throw new Error(`Unknown provider: ${p}`);
      }

      // Success!
      return {
        ok: true,
        result,
        attempts,
        provider: p,
      };
    } catch (err: any) {
      console.error(`Error with provider ${p}:`, err);
      lastError = err;
      
      // Record the attempt
      attempts.push({
        provider: p,
        code: err.code,
        status: err.status,
        message: err.message || 'Unknown error',
        preview: err.preview || err.raw?.slice?.(0, 200),
      });

      // If it's a parsing error, try once more with a stronger JSON instruction
      if (err.message?.includes('JSON') && !attempts.find(a => a.provider === p && a.message?.includes('retry'))) {
        try {
          console.log(`Retrying ${p} with explicit JSON instruction`);
          
          // Add stronger JSON instruction
          const retryUserPrompt = userPrompt + '\n\nReturn ONLY JSON. No pre/post text.';
          
          let retryResult: TailorResponseT;
          
          if (p === 'google') {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');
            
            const googlePrompt = SYSTEM_PROMPT + '\n\n' + retryUserPrompt;
            retryResult = await googleTailorResume({ 
              apiKey, 
              model: p === provider ? model : undefined,
              prompt: googlePrompt 
            });
          } 
          else if (p === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
            
            retryResult = await openaiTailorResume({ 
              apiKey, 
              model: p === provider ? model : undefined,
              system: SYSTEM_PROMPT + '\nReturn ONLY JSON. No markdown fences, no commentary.',
              user: retryUserPrompt 
            });
          } 
          else if (p === 'anthropic') {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
            
            retryResult = await anthropicTailorResume({ 
              apiKey, 
              model: p === provider ? model : undefined,
              system: SYSTEM_PROMPT + '\nReturn ONLY JSON. No markdown fences, no commentary.',
              user: retryUserPrompt 
            });
          }
          else {
            throw new Error(`Unknown provider: ${p}`);
          }

          // Success on retry!
          return {
            ok: true,
            result: retryResult,
            attempts,
            provider: p,
          };
        } catch (retryErr: any) {
          console.error(`Retry failed with provider ${p}:`, retryErr);
          attempts.push({
            provider: p,
            code: retryErr.code,
            status: retryErr.status,
            message: `Retry failed: ${retryErr.message || 'Unknown error'}`,
            preview: retryErr.preview || retryErr.raw?.slice?.(0, 200),
          });
        }
      }
    }
  }

  // All providers failed
  return {
    ok: false,
    attempts,
    lastError,
  };
}