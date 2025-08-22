import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbOrNull } from '@/lib/db';
import { recordGeneration, getUserUsage, hasReachedLimit } from '@/lib/usage';
import { tailorResume } from '@/lib/generators/tailorResume';
import { tailorCoverLetter } from '@/lib/generators/tailorCoverLetter';
import { createDevLogger } from "@/lib/utils/devLogger";
import { recordError } from '../../debug/last-errors/route';

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
      error: 'USAGE_LIMIT_REACHED', 
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
    const userId = 'anon'; // Replace with session user if available
    const db = getDbOrNull();

    // 1) Tailor resume
    let tr;
    try {
      logger.info(`Tailoring resume [${reqId}]`);
      tr = await tailorResume({ 
        requested: { provider, model },
        masterResume: resume ? await resume.text() : '',
        jobDescription,
        preserveFormat: true
      });
      logger.info(`Resume tailoring successful using ${tr.provider}/${tr.model} [${reqId}]`);
      
      // Record successful generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: tr.provider,
        type: 'resume',
        status: 'success',
        inputChars: jobDescription.length + (resume ? await resume.text().then(t => t.length) : 0),
        outputChars: JSON.stringify(tr.result).length,
        inputTokens: tr.tokenUsage?.inputTokens,
        outputTokens: tr.tokenUsage?.outputTokens,
        estimatedTokens: tr.tokenUsage?.estimatedTokens,
        transaction: db
      }).catch(e => logger.warn('Failed to record generation', e));
    } catch (e: any) {
      logger.error(`Resume tailoring failed [${reqId}]`, e);
      recordError(reqId, e);
      
      // Record failed generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: e?.provider || provider || 'unknown',
        type: 'resume',
        status: 'error',
        inputChars: jobDescription.length + (resume ? await resume.text().then(t => t.length) : 0),
        errorMessage: e?.message || 'Unknown error',
        transaction: db
      }).catch(err => logger.warn('Failed to record generation error', err));
      
      return NextResponse.json({ 
        ok: false,
        id: reqId,
        error: 'TAILORING_FAILED', 
        stage: 'resume', 
        details: e?.code || e?.message, 
        preview: e?.preview,
        provider: e?.provider,
        model: e?.model,
      }, { status: 422 });
    }

    // 2) Generate cover letter
    let cl;
    try {
      logger.info(`Generating cover letter [${reqId}]`);
      cl = await tailorCoverLetter({ 
        requested: { provider, model },
        tailoredResume: tr.result,
        jobDescription,
        jobUrl
      });
      logger.info(`Cover letter generation successful using ${cl.provider}/${cl.model} [${reqId}]`);
      
      // Record successful generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: cl.provider,
        type: 'cover_letter',
        status: 'success',
        inputChars: jobDescription.length + JSON.stringify(tr.result).length,
        outputChars: JSON.stringify(cl.result).length,
        inputTokens: cl.tokenUsage?.inputTokens,
        outputTokens: cl.tokenUsage?.outputTokens,
        estimatedTokens: cl.tokenUsage?.estimatedTokens,
        transaction: db
      }).catch(e => logger.warn('Failed to record generation', e));
    } catch (e: any) {
      logger.error(`Cover letter generation failed [${reqId}]`, e);
      recordError(reqId, e);
      
      // Record failed generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: e?.provider || provider || 'unknown',
        type: 'cover_letter',
        status: 'error',
        inputChars: jobDescription.length + JSON.stringify(tr.result).length,
        errorMessage: e?.message || 'Unknown error',
        transaction: db
      }).catch(err => logger.warn('Failed to record generation error', err));
      
      return NextResponse.json({ 
        ok: false,
        id: reqId,
        error: 'COVER_LETTER_FAILED', 
        stage: 'cover-letter', 
        details: e?.code || e?.message, 
        preview: e?.preview,
        provider: e?.provider,
        model: e?.model,
      }, { status: 422 });
    }

    // Get usage data (won't fail if DB is unavailable)
    const usage = getUserUsage(userId);
    
    logger.info(`Resume generation complete [${reqId}], usage=${usage.count}/${usage.limit}`);
    return NextResponse.json({
      ok: true,
      id: reqId,
      provider: { 
        resume: { provider: tr.provider, model: tr.model }, 
        coverLetter: { provider: cl.provider, model: cl.model } 
      },
      tailored: { 
        resume: tr.result, 
        coverLetter: cl.result 
      },
      usage: {
        count: usage.count,
        limit: usage.limit,
        remaining: usage.remaining,
        tokenUsage: {
          resume: tr.tokenUsage,
          coverLetter: cl.tokenUsage
        }
      }
    }, { status: 200 });
  } catch (err: any) {
    logger.error(`Unexpected error [${reqId}]`, err);
    recordError(reqId, err);
    return NextResponse.json({ 
      ok: false,
      id: reqId,
      error: 'INTERNAL_ERROR', 
      message: err?.message || 'Unexpected error',
    }, { status: 500 });
  }
}