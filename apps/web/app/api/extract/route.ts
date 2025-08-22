// apps/web/app/api/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractJob, BlockedExtractionError } from '@/lib/services/extractJob';

export async function POST(req: NextRequest) {
  const body = await req.json(); // { url?: string, jdText?: string }
  try {
    const data = await extractJob(body);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    if (err instanceof BlockedExtractionError) {
      return NextResponse.json(
        { ok: false, code: 'BLOCKED_EXTRACTION', message: 'This site blocked automated extraction.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, code: 'UNKNOWN', message: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
