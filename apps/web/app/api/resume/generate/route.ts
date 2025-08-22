import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbOrNull } from '@/lib/db';
import { recordGeneration, getUserUsage, hasReachedLimit } from '@/lib/usage';
import { createDevLogger } from "@/lib/utils/devLogger";
import { recordError } from '../../debug/last-errors/route';
import { googleTailorResume } from '@/lib/ai/providers/google';
import { openaiTailorResume } from '@/lib/ai/providers/openai';
import { anthropicTailorResume } from '@/lib/ai/providers/anthropic';

const logger = createDevLogger("api:resume:generate");

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  jobDescription: z.string().min(10, 'Job description is too short'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.enum(['auto','openai','anthropic','google']).default('auto'),
  model: z.string().min(1, 'Model is required'),
});

async function parseBody(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const resume = (fd.get('resume') as File) ?? null;
    const jobDescription = String(fd.get('jdText') ?? '');
    const jobUrl = fd.get('jdUrl') ? String(fd.get('jdUrl')) : undefined;
    const provider = String(fd.get('provider') ?? 'auto').toLowerCase();
    const model = String(fd.get('model') ?? '').trim();

    const parsed = BodySchema.safeParse({ jobDescription, jobUrl, provider, model });
    if (!parsed.success) {
      return { error: { code: 'BAD_REQUEST', message: parsed.error.issues.map(i => i.message).join('; ') } };
    }
    return { data: { ...parsed.data, resume } };
  } else {
    const json = await req.json().catch(() => null);
    if (!json) return { error: { code: 'BAD_JSON', message: 'Invalid JSON body' } };
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return { error: { code: 'BAD_REQUEST', message: parsed.error.issues.map(i => i.message).join('; ') } };
    }
    return { data: { ...parsed.data, resume: null as File | null } };
  }
}

export async function POST(req: NextRequest) {
  const reqId = crypto.randomUUID();
  logger.info(`Starting resume generation [${reqId}]`);
  
  // Check if the user has reached their usage limit
  if (hasReachedLimit()) {
    logger.warn(`User has reached usage limit [${reqId}]`);
    return NextResponse.json({ 
      ok: false,
      id: reqId,
      code: 'USAGE_LIMIT_REACHED',
      message: 'You have reached your usage limit. Please try again later.',
      usage: getUserUsage(),
    }, { status: 429 });
  }

  try {
    const result = await parseBody(req);
    if ('error' in result) {
      return NextResponse.json({ 
        ok: false, 
        id: reqId, 
        ...result.error 
      }, { status: 400 });
    }

    const { jobDescription, jobUrl, provider, model, resume } = result.data;
    const resumeText = resume ? await resume.text() : '';
    const userId = 'anon'; // Replace with session user if available
    const db = getDbOrNull();

    let tailoredResult;
    try {
      if (provider === 'google') {
        tailoredResult = await googleTailorResume({ jobDescription, resumeText, model });
      } else if (provider === 'openai') {
        tailoredResult = await openaiTailorResume({ jobDescription, resumeText, model });
      } else if (provider === 'anthropic') {
        tailoredResult = await anthropicTailorResume({ jobDescription, resumeText, model });
      } else {
        // auto: try Google → OpenAI → Anthropic
        try {
          tailoredResult = await googleTailorResume({ jobDescription, resumeText, model });
        } catch (e) {
          try {
            tailoredResult = await openaiTailorResume({ jobDescription, resumeText, model });
          } catch (e) {
            tailoredResult = await anthropicTailorResume({ jobDescription, resumeText, model });
          }
        }
      }

      // Record successful generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider,
        type: 'resume',
        status: 'success',
        inputChars: jobDescription.length + resumeText.length,
        outputChars: JSON.stringify(tailoredResult).length,
        transaction: db
      }).catch(e => logger.warn('Failed to record generation', e));

      // Get usage data (won't fail if DB is unavailable)
      const usage = getUserUsage(userId);
      
      return NextResponse.json({
        ok: true,
        id: reqId,
        result: tailoredResult,
        usage
      }, { status: 200 });

    } catch (err: any) {
      const payload = {
        ok: false,
        id: reqId,
        code: err?.code ?? 'UNEXPECTED_ERROR',
        message: err?.message ?? 'Unexpected error',
        provider,
        model,
        issues: err?.issues ?? undefined,
        preview: err?.preview ?? undefined,
      };
      console.error('[DEV:api:resume:generate] ERROR:', payload);
      
      // Record error
      recordError(reqId, err);
      
      // Record failed generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: err?.provider || provider || 'unknown',
        type: 'resume',
        status: 'error',
        inputChars: jobDescription.length + resumeText.length,
        errorMessage: err?.message || 'Unknown error',
        transaction: db
      }).catch(e => logger.warn('Failed to record generation error', e));
      
      return NextResponse.json(payload, { 
        status: payload.code?.includes('PARSE') || payload.code?.includes('VALIDATE') ? 422 : 500 
      });
    }
  } catch (err: any) {
    const payload = {
      ok: false,
      id: reqId,
      code: err?.code ?? 'UNEXPECTED_ERROR',
      message: err?.message ?? 'Unexpected error',
      provider: err?.provider,
      model: err?.model,
      issues: err?.issues ?? undefined,
      preview: err?.preview ?? undefined,
    };
    console.error('[DEV:api:resume:generate] ERROR:', payload);
    recordError(reqId, err);
    return NextResponse.json(payload, { 
      status: payload.code?.includes('PARSE') || payload.code?.includes('VALIDATE') ? 422 : 500 
    });
  }
}