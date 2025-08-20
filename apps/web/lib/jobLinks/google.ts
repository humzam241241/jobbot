// apps/web/lib/jobLinks/google.ts
import type { JobLink } from './providers';
import { classify, normalizeLinkedIn } from './providers';

export async function googleSearch(q: string, opts?: { count?: number }): Promise<JobLink[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error('Missing GOOGLE_API_KEY or GOOGLE_CSE_ID');
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', q);
  url.searchParams.set('num', String(opts?.count ?? 10)); // Google's default is 10, max is 10 per request in free tier

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Custom Search failed: ${res.status}`);
  }

  const json: any = await res.json();
  const items = json.items ?? [];
  const seen = new Set<string>();
  const out: JobLink[] = [];

  for (const item of items) {
    let u: string = item.link;
    if (!u) continue;
    if (u.includes('linkedin.com')) u = normalizeLinkedIn(u);
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({
      title: item.title,
      url: u,
      snippet: item.snippet,
      source: classify(u),
    });
  }

  return out;
}
