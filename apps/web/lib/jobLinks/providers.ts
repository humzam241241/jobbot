// apps/web/lib/jobLinks/providers.ts
export type JobLink = {
  title: string;
  url: string;
  source: 'linkedin'|'greenhouse'|'lever'|'workday'|'workable'|'indeed'|'other';
  snippet?: string;
};

export function classify(url: string): JobLink['source'] {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('linkedin.com')) return 'linkedin';
    if (h.includes('greenhouse.io') || h.includes('boards.greenhouse.io')) return 'greenhouse';
    if (h.includes('lever.co')) return 'lever';
    if (h.includes('myworkdayjobs.com') || h.includes('workday')) return 'workday';
    if (h.includes('workable.com')) return 'workable';
    if (h.includes('indeed.')) return 'indeed';
    return 'other';
  } catch { return 'other'; }
}

export function normalizeLinkedIn(url: string): string {
  try {
    const u = new URL(url);
    // Prefer canonical /jobs/view/<id> paths; strip params/fragments
    if (/^\/jobs\/view\/\d+/i.test(u.pathname)) { u.search = ''; u.hash=''; return u.toString(); }
    u.search = ''; u.hash = '';
    return u.toString();
  } catch { return url; }
}
