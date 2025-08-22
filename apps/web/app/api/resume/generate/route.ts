import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbOrNull } from '@/lib/db';
import { recordGeneration, getUserUsage, hasReachedLimit } from '@/lib/usage';
import { createDevLogger } from "@/lib/utils/devLogger";
import { recordError } from '../../debug/last-errors/route';
import { kitStore } from "@/lib/kitStore";
import { TAILOR_SCHEMA_TEXT } from "@/lib/schemas/schemaText";
import { computeATS } from "@/lib/ats/score";
import { googleTailorResume } from "@/lib/ai/providers/google";
import { openaiTailorResume } from "@/lib/ai/providers/openai";
import { anthropicTailorResume } from "@/lib/ai/providers/anthropic";

const logger = createDevLogger("api:resume:generate");

export const dynamic = "force-dynamic";

export type Provider = 'google' | 'openai' | 'anthropic';

const BodySchema = z.object({
  jobDescription: z.string().min(10, 'Job description is too short'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.enum(['auto','openai','anthropic','google']).default('auto'),
  model: z.string().optional(),
  resume: z.any().optional(), // Will be File type from FormData
});

async function parseBody(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const data = {
        jobDescription: formData.get('jdText')?.toString() || '',
        jobUrl: formData.get('jdUrl')?.toString() || '',
        provider: formData.get('provider')?.toString() || 'auto',
        model: formData.get('model')?.toString() || undefined,
        resume: formData.get('resume') || null,
      };

      logger.info('Parsing multipart form data:', { ...data, resume: !!data.resume });
      
      const parsed = BodySchema.safeParse(data);
      if (!parsed.success) {
        return { 
          error: { 
            code: 'BAD_REQUEST', 
            message: parsed.error.issues.map(i => i.message).join('; '),
            details: parsed.error.issues
          } 
        };
      }
      return { data: parsed.data };

    } else {
      // Handle JSON request
      const text = await req.text();
      if (!text) {
        return { error: { code: 'BAD_REQUEST', message: 'Empty request body' } };
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        return { 
          error: { 
            code: 'BAD_JSON', 
            message: 'Invalid JSON in request body',
            details: String(e)
          } 
        };
      }

      logger.info('Parsing JSON body:', json);
      
      const parsed = BodySchema.safeParse(json);
      if (!parsed.success) {
        return { 
          error: { 
            code: 'BAD_REQUEST', 
            message: parsed.error.issues.map(i => i.message).join('; '),
            details: parsed.error.issues
          } 
        };
      }
      return { data: { ...parsed.data, resume: null } };
    }
  } catch (err) {
    logger.error('Failed to parse request body:', err);
    return { 
      error: { 
        code: 'REQUEST_FAILED', 
        message: 'Failed to parse request body',
        details: String(err)
      } 
    };
  }
}

function pickProviderOrderFromQueryOrUI(provider: string): Provider[] {
  if (provider === 'auto') {
    return ['google', 'openai', 'anthropic'];
  }
  
  const primary = provider as Provider;
  const others: Provider[] = ['google', 'openai', 'anthropic'].filter(p => p !== primary) as Provider[];
  return [primary, ...others];
}

export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();
  logger.info(`Starting resume generation [${traceId}]`);
  
  try {
    const result = await parseBody(req);
    if ('error' in result) {
      logger.error(`Request parsing failed [${traceId}]:`, result.error);
      return NextResponse.json({ 
        ok: false, 
        id: traceId, 
        ...result.error 
      }, { status: 400 });
    }

    const { jobDescription, jobUrl, provider, model, resume } = result.data;
    
    // Validate required fields
    if (!jobDescription?.trim()) {
      return NextResponse.json({
        ok: false,
        id: traceId,
        code: 'BAD_REQUEST',
        message: 'Job description is required'
      }, { status: 400 });
    }

    // Get resume text
    let resumeText = '';
    try {
      resumeText = resume ? await resume.text() : '';
    } catch (err) {
      logger.error(`Failed to read resume file [${traceId}]:`, err);
      return NextResponse.json({
        ok: false,
        id: traceId,
        code: 'BAD_REQUEST',
        message: 'Failed to read resume file'
      }, { status: 400 });
    }

    if (!resumeText?.trim()) {
      return NextResponse.json({
        ok: false,
        id: traceId,
        code: 'BAD_REQUEST',
        message: 'Resume content is required'
      }, { status: 400 });
    }

    const userId = 'anon'; // Replace with session user if available
    const db = getDbOrNull();
    const schemaText = TAILOR_SCHEMA_TEXT;

    // Build the prompt
    const prompt = [
      '--- ORIGINAL RESUME ---',
      resumeText,
      '',
      '--- JOB DESCRIPTION ---',
      jobDescription,
      '',
      'Tailor the resume to match the job description. Make it ATS-optimized and impressive.',
      'Include a professional cover letter based on the resume and job description.'
    ].join('\n');

    // Attempt providers in order based on selection + fallbacks
    const attempts: any[] = [];
    let data;

    const providersInOrder = pickProviderOrderFromQueryOrUI(provider);
    for (const p of providersInOrder) {
      // Check provider-specific rate limit
      if (hasReachedLimit(userId, p)) {
        logger.warn(`Rate limit reached for ${p}`);
        attempts.push({
          provider: p,
          code: 'RATE_LIMIT',
          message: `Rate limit reached for ${p}`,
          status: 429
        });
        continue;
      }

      try {
        logger.info(`Attempting with provider: ${p}`);
        
        const args = {
          apiKey: process.env[`${p.toUpperCase()}_API_KEY`]!,
          model,
          prompt,
          schemaText
        };

        if (p === "google") {
          data = await googleTailorResume(args);
        } else if (p === "openai") {
          data = await openaiTailorResume(args);
        } else {
          data = await anthropicTailorResume(args);
        }
        break;
      } catch (err: any) {
        logger.error(`Error with provider ${p}:`, err);
        attempts.push({ 
          provider: p, 
          message: String(err?.message ?? err), 
          code: err?.code, 
          status: err?.status,
          hint: err?.hint
        });

        // Stop on hard errors
        if (err?.code === 'AUTH_ERROR' || err?.code === 'CONFIG_MISSING') {
          break;
        }
      }
    }

    if (!data) {
      const err = attempts[attempts.length - 1];
      recordError(traceId, err);
      
      // Record failed generation
      await recordGeneration({
        traceId,
        userId,
        provider: err?.provider || providersInOrder[0] || 'unknown',
        type: 'resume',
        status: 'error',
        inputChars: jobDescription.length + resumeText.length,
        errorMessage: err?.message || 'Unknown error',
        transaction: db
      }).catch((e: Error) => logger.warn('Failed to record generation error', e));
      
      return NextResponse.json({ 
        ok: false, 
        id: traceId, 
        code: "PIPELINE_FAILED", 
        message: "All providers failed",
        attempts,
        usage: getUserUsage(userId) // Include current usage stats
      }, { status: 500 });
    }

    // Success! Calculate ATS score and store the result
    const ats = computeATS(data, jobDescription);
    kitStore.set(traceId, data);

    // Record successful generation
    await recordGeneration({
      traceId,
      userId,
      provider: providersInOrder[0],
      type: 'resume',
      status: 'success',
      inputChars: jobDescription.length + resumeText.length,
      outputChars: JSON.stringify(data).length,
      transaction: db
    }).catch((e: Error) => logger.warn('Failed to record generation', e));

    // Get usage data (won't fail if DB is unavailable)
    const usage = getUserUsage(userId);
    
    return NextResponse.json({
      ok: true,
      id: traceId,
      data,
      ats,
      attempts,
      usage
    }, { status: 200 });
  } catch (err: any) {
    logger.error(`Unexpected error [${traceId}]:`, err);
    const payload = {
      ok: false,
      id: traceId,
      code: err?.code ?? 'UNEXPECTED_ERROR',
      message: err?.message ?? 'Unexpected error',
      preview: err?.preview,
      details: String(err)
    };
    recordError(traceId, err);
    return NextResponse.json(payload, { status: 500 });
  }
}