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

const FALLBACK_ENABLED = process.env.LLM_AUTO_FALLBACK !== '0';

type ProviderKey = 'google' | 'openai' | 'anthropic';

const BodySchema = z.object({
  jobDescription: z.string().min(10, 'Job description is too short'),
  jobUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  provider: z.enum(['auto','openai','anthropic','google']).default('auto'),
  model: z.string().min(1, 'Model is required'),
});

async function attemptOne(p: ProviderKey, args: any) {
  if (p === 'google')  return googleTailorResume(args);
  if (p === 'openai')  return openaiTailorResume(args);
  if (p === 'anthropic') return anthropicTailorResume(args);
  throw new Error(`Unknown provider: ${p}`);
}

function availableProviders(): ProviderKey[] {
  const out: ProviderKey[] = [];
  if (process.env.GOOGLE_API_KEY) out.push('google');
  if (process.env.OPENAI_API_KEY) out.push('openai');
  if (process.env.ANTHROPIC_API_KEY) out.push('anthropic');
  return out;
}

async function runWithFallback(primary: ProviderKey, args: any) {
  const seen: Record<string, true> = {};
  const order = [primary, ...(['google','openai','anthropic'] as ProviderKey[]).filter(x => x !== primary)];
  const avail = availableProviders().filter(p => order.includes(p));
  const attempts: any[] = [];

  for (const p of order) {
    if (!avail.includes(p)) continue; // skip unavailable
    if (seen[p]) continue;
    seen[p] = true;

    try {
      const result = await attemptOne(p, args);
      return { ok: true, provider: p, result, attempts };
    } catch (err: any) {
      attempts.push({
        provider: p,
        code: err?.code ?? 'UNEXPECTED_ERROR',
        message: err?.message ?? String(err),
        status: err?.status,
        retryAfter: err?.retryAfter,
        preview: err?.preview,
      });

      // Only fall back on "soft" errors; stop on hard config errors
      const soft = ['RATE_LIMIT','MODEL_EMPTY_OUTPUT','JSON_PARSE_ERROR','JSON_VALIDATE_ERROR'];
      const hard = ['CONFIG_MISSING','AUTH_ERROR'];
      if (!FALLBACK_ENABLED || hard.includes(err?.code)) {
        return { ok: false, attempts, lastError: err };
      }
      // continue to next provider for soft errors
    }
  }
  return { ok: false, attempts, lastError: attempts[attempts.length - 1] };
}

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

    const primary = (provider as ProviderKey) ?? 'google';
    const args = { jobDescription, resumeText, model };

    const { ok, result: tailoredResult, attempts, lastError, provider: usedProvider } = 
      await runWithFallback(primary, args);

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
    const payload = {
      ok: false,
      id: reqId,
      code: err?.code ?? 'UNEXPECTED_ERROR',
      message: err?.message ?? 'Unexpected error',
      provider: primary,
      model,
      attempts,
      preview: err?.preview,
    };

    const status =
      payload.code === 'RATE_LIMIT' ? 429 :
      payload.code?.includes('PARSE') || payload.code?.includes('VALIDATE') ? 422 : 500;

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