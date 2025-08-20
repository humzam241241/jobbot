import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';

function hash(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== 'string') return NextResponse.json({ error: 'url required' }, { status: 400 });

  const cacheKey = 'jd:' + hash(url);
  const cached = await (prisma as any).cache.findUnique({ where: { key: cacheKey } }).catch(() => null);
  if (cached) {
    return NextResponse.json(JSON.parse(JSON.stringify(cached.value)));
  }

  const resp = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Jobbot/1.0' } });
  const html = await resp.text();
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, noscript').remove();
  const text = $('body').text();
  const jdText = text.replace(/\s+/g, ' ').trim();

  const title = $('title').first().text().slice(0, 200) || null;
  const company = $('[data-company], .company, .employer').first().text().slice(0, 120) || null;
  const location = $('[data-location], .location').first().text().slice(0, 120) || null;
  const salary = $('[data-salary], .salary').first().text().slice(0, 120) || null;

  const jdHash = hash(jdText).slice(0, 32);
  // Ensure we have a user to associate with the job (fallback to a system user if needed)
  let user = await (prisma as any).user.findFirst();
  if (!user) {
    user = await (prisma as any).user.create({ data: { email: `seed-${Date.now()}@example.com` } });
  }
  const userId = user.id;
  const jobId = hash((url + (title || '')).slice(0, 200)).slice(0, 24);
  const job = await (prisma as any).job.upsert({
    where: { id: jobId },
    update: { jdText, jdHash, title, company, location, salary, canonicalUrl: url },
    create: {
      id: jobId,
      userId: userId!,
      source: 'URL',
      url,
      canonicalUrl: url,
      jdText,
      jdHash,
      title,
      company,
      location,
      salary,
    },
  });
  const out = { jobId: job.id, title, company, location, salary, jdText, canonicalUrl: url };
  await (prisma as any).cache.upsert({
    where: { key: cacheKey },
    update: { value: out, ttl: 7 * 24 * 3600 },
    create: { key: cacheKey, value: out, ttl: 7 * 24 * 3600 },
  });
  return NextResponse.json(out);
}


