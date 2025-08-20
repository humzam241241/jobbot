// apps/web/lib/jobLinks/bing.ts
import type { JobLink } from './providers';
import { classify, normalizeLinkedIn } from './providers';

export async function bingSearch(q: string, opts?: { freshness?: 'Day'|'Week'|'Month'; count?: number }): Promise<JobLink[]> {
  const key = process.env.BING_SEARCH_KEY;
  if (!key) throw new Error('Missing BING_SEARCH_KEY');
  const url = new URL('https://api.bing.microsoft.com/v7.0/search');
  url.searchParams.set('q', q);
  if (opts?.freshness) url.searchParams.set('freshness', opts.freshness);
  url.searchParams.set('textDecorations', 'false');
  url.searchParams.set('count', String(opts?.count ?? 20));

  const res = await fetch(url.toString(), { headers: { 'Ocp-Apim-Subscription-Key': key } });
  if (!res.ok) throw new Error(`Bing search failed: ${res.status}`);
  const json: any = await res.json();
  const items = json.webPages?.value ?? [];
  const seen = new Set<string>();
  const out: JobLink[] = [];
  for (const item of items) {
    let u: string = item.url;
    if (u.includes('linkedin.com')) u = normalizeLinkedIn(u);
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ title: item.name, url: u, snippet: item.snippet, source: classify(u) });
  }
  return out;
}
