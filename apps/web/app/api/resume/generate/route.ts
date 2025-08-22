import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { buildResumePdf } from '@/lib/pdf/buildResumePdf';
import { googleTailorResume } from '@/lib/ai/providers/google';
import { openaiTailorResume } from '@/lib/ai/providers/openai';
import { anthropicTailorResume } from '@/lib/ai/providers/anthropic';
import { Provider, validateProvider, checkProviderAvailable } from '@/lib/ai/providers/router';

export const runtime = "nodejs";

const BodySchema = z.object({
  jobDescription: z.string().min(10, 'Job description is too short'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.string().default('auto'),
  model: z.string().optional(),
  resume: z.boolean().default(false),
  resumeText: z.string().min(1, 'Resume text is required'),
});

function pickProviderOrder(requested: string): Provider[] {
  if (requested === 'auto') {
    return ['google', 'openai', 'anthropic'];
  }
  if (!validateProvider(requested)) {
    logger.warn(`Invalid provider ${requested}, falling back to auto`);
    return ['google', 'openai', 'anthropic'];
  }
  const others = ['google', 'openai', 'anthropic'].filter(p => p !== requested) as Provider[];
  return [requested as Provider, ...others];
}

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();
  logger.info(`Starting resume generation [${traceId}]`);

  try {
    // Parse and validate request
    const body = await req.json().catch(() => ({}));
    const result = BodySchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({
        ok: false,
        errors: result.error.issues,
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { jobDescription, provider, model, resume: wantsPdf, resumeText } = result.data;

    // Try providers in sequence
    const attempts = [];
    let generatedText: string | null = null;

    const providers = pickProviderOrder(provider);
    for (const p of providers) {
      // Check if provider is available
      if (!checkProviderAvailable(p)) {
        attempts.push({
          provider: p,
          error: 'API key not configured',
          status: 503
        });
        continue;
      }

      try {
        logger.info(`Attempting with provider: ${p}`);
        
        if (p === 'google') {
          generatedText = await googleTailorResume({
            apiKey: process.env.GOOGLE_API_KEY!,
            model,
            resumeText,
            jobDescription
          });
        }
        else if (p === 'openai') {
          generatedText = await openaiTailorResume({
            apiKey: process.env.OPENAI_API_KEY!,
            model,
            resumeText,
            jobDescription
          });
        }
        else if (p === 'anthropic') {
          generatedText = await anthropicTailorResume({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            model,
            resumeText,
            jobDescription
          });
        }

        if (generatedText) {
          logger.info(`Success with provider: ${p}`);
          break;
        }
      } catch (err: any) {
        logger.error(`Error with provider ${p}:`, err);
        attempts.push({
          provider: p,
          error: err.message || 'Unknown error',
          status: err.status || 500,
          code: err.code
        });
      }
    }

    if (!generatedText) {
      return new Response(JSON.stringify({
        ok: false,
        message: 'All providers failed',
        attempts
      }), { 
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return PDF or JSON based on request
    if (wantsPdf) {
      const pdfBytes = await buildResumePdf(generatedText);
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="resume-${traceId}.pdf"`
        }
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      text: generatedText,
      attempts
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    logger.error('Unexpected error:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: err.message || 'Internal server error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}