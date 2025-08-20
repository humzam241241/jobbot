// apps/web/app/api/job-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildQuery, JobSearchParams } from '@/lib/jobLinks/query';
import { bingSearch } from '@/lib/jobLinks/bing';
import { googleSearch } from '@/lib/jobLinks/google';
import { JobLink } from '@/lib/jobLinks/providers';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JobSearchParams;
    const q = buildQuery(body);

    let results: JobLink[] = [];
    // Prefer Google Search if keys are available
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID) {
      results = await googleSearch(q, { count: body.limit ?? 10 });
    } else if (process.env.BING_SEARCH_KEY) {
      results = await bingSearch(q, { freshness: body.freshness, count: body.limit ?? 20 });
    } else {
      return NextResponse.json(
        { ok: false, message: 'No search provider configured. Please set GOOGLE_API_KEY/GOOGLE_CSE_ID or BING_SEARCH_KEY.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: results });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? 'Unknown search error' },
      { status: 500 }
    );
  }
}
