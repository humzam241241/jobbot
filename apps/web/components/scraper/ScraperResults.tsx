import React from 'react'

export type ScrapedJob = {
  id: string; title: string; company: string; location?: string;
  source: 'linkedin'|'indeed'|'glassdoor'|'greenhouse'|'lever'|'custom';
  url: string; postedAt?: string; match?: number;
}

type Props = { jobs: ScrapedJob[], onSave: (job: ScrapedJob) => void, savedJobs: string[] }

export default function ScraperResults({ jobs, onSave, savedJobs }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-white/[0.03] p-3 backdrop-blur">
      {jobs.length === 0 ? (
        <div className="text-sm text-slate-400">No results yet. Run the scraper.</div>
      ) : (
        <div className="divide-y divide-slate-800">
          {jobs.map(j => (
            <div key={j.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{j.title} · {j.company}</div>
                <div className="text-xs text-slate-400">{j.location||'—'} · {j.source} · {j.postedAt||'recent'}</div>
              </div>
              <div className="flex items-center gap-2">
                {typeof j.match==='number' && <span className="rounded-full bg-slate-800 px-2 py-1 text-xs">Match {j.match}%</span>}
                <a className="button" href={j.url} target="_blank" rel="noreferrer">Open JD</a>
                <button className="button" onClick={() => onSave(j)} disabled={savedJobs.includes(j.id)}>
                  {savedJobs.includes(j.id) ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}



