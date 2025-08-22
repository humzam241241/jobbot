import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDbOrNull } from '@/lib/db';
import { recordGeneration, getUserUsage, hasReachedLimit } from '@/lib/usage';
import { createDevLogger } from "@/lib/utils/devLogger";
import { recordError } from '../../debug/last-errors/route';
import { tailorResume, Provider } from '@/lib/generators/tailorResume';

const logger = createDevLogger("api:resume:generate");

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  jobDescription: z.string().min(10, 'Job description is too short'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.enum(['auto','openai','anthropic','google']).default('auto'),
  model: z.string().optional(),
});

async function parseBody(req: NextRequest) {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const resume = (fd.get('resume') as File) ?? null;
    const jobDescription = String(fd.get('jdText') ?? '');
    const jobUrl = fd.get('jdUrl') ? String(fd.get('jdUrl')) : undefined;
    const provider = String(fd.get('provider') ?? 'auto').toLowerCase();
    const model = String(fd.get('model') ?? '').trim() || undefined;

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

    // Map 'auto' to default provider
    const primary = provider === 'auto' ? 'google' : provider as Provider;

    // Run the tailored resume generator
    const { ok, result: tailoredResult, attempts, lastError, provider: usedProvider } = 
      await tailorResume({
        jobDescription,
        resumeText,
        provider: primary,
        model,
      });

    if (ok && tailoredResult) {
      // Record successful generation
      await recordGeneration({
        traceId: reqId,
        userId,
        provider: usedProvider || primary,
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
        providerUsed: usedProvider ?? primary,
        fallbackUsed: (usedProvider && usedProvider !== primary) || (attempts?.length ?? 0) > 0,
        attempts,
        result: tailoredResult,
        usage
      }, { status: 200 });
    }

    const err: any = lastError ?? {};
    const status =
      err?.code === 'RATE_LIMIT' ? 429 :
      err?.code === 'MODEL_NOT_FOUND' ? 400 :
      err?.code?.includes('PARSE') || err?.code?.includes('VALIDATE') ? 422 : 500;

    const payload = {
      ok: false,
      id: reqId,
      code: err?.code ?? 'UNEXPECTED_ERROR',
      message: err?.message ?? 'Unexpected error',
      provider: primary,
      model,
      attempts,
      hint: err?.hint,
      preview: err?.preview,
    };

    // Record error
    recordError(reqId, err);
    
    // Record failed generation
    await recordGeneration({
      traceId: reqId,
      userId,
      provider: err?.provider || primary || 'unknown',
      type: 'resume',
      status: 'error',
      inputChars: jobDescription.length + resumeText.length,
      errorMessage: err?.message || 'Unknown error',
      transaction: db
    }).catch(e => logger.warn('Failed to record generation error', e));

    console.error('[DEV:api:resume:generate] ERROR:', payload);
    return NextResponse.json(payload, { status });
  } catch (err: any) {
    const payload = {
      ok: false,
      id: reqId,
      code: err?.code ?? 'UNEXPECTED_ERROR',
      message: err?.message ?? 'Unexpected error',
      preview: err?.preview,
    };
    console.error('[DEV:api:resume:generate] ERROR:', payload);
    recordError(reqId, err);
    return NextResponse.json(payload, { status: 500 });
  }
}