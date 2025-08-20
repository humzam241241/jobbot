// apps/web/lib/jobLinks/query.ts
export type JobSearchParams = {
  query: string;
  location?: string;
  onlyLinkedIn?: boolean;
  freshness?: 'Day'|'Week'|'Month';
  limit?: number;
};

export function buildQuery(p: JobSearchParams): string {
  const parts: string[] = [];
  parts.push(`"${p.query}"`);
  if (p.location) parts.push(`"${p.location}"`);
  const sites = p.onlyLinkedIn
    ? ['site:linkedin.com/jobs/view']
    : [
        'site:linkedin.com/jobs/view',
        'site:boards.greenhouse.io',
        'site:jobs.lever.co',
        'site:myworkdayjobs.com',
        'site:workable.com',
        'site:indeed.com'
      ];
  parts.push(`(${sites.join(' OR ')})`);
  return parts.join(' ');
}
