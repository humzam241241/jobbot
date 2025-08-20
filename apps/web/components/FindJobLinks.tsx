import { useState } from 'react';

type JobLink = { title: string; url: string; source: string; snippet?: string };
type Props = {
  onUseUrl: (url: string) => void; // e.g., pre-fill form & trigger paste flow for LinkedIn
};

export default function FindJobLinks({ onUseUrl }: Props) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [onlyLinkedIn, setOnlyLinkedIn] = useState(false);
  const [freshness, setFreshness] = useState<'Day'|'Week'|'Month'>('Week');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<JobLink[]>([]);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/job-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, onlyLinkedIn, freshness, limit: 20 }),
      });
      const json = await res.json();
      setResults(json?.data ?? []);
    } finally { setBusy(false); }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); } catch {}
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <input className="rounded border p-2 md:col-span-1" placeholder="Job Title (e.g., Mechanical Engineer)"
               value={query} onChange={e=>setQuery(e.target.value)} />
        <input className="rounded border p-2 md:col-span-1" placeholder="Location (optional)"
               value={location} onChange={e=>setLocation(e.target.value)} />
        <select className="rounded border p-2 md:col-span-1" value={freshness} onChange={e=>setFreshness(e.target.value as any)}>
          <option value="Day">Past Day</option>
          <option value="Week">Past Week</option>
          <option value="Month">Past Month</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyLinkedIn} onChange={e=>setOnlyLinkedIn(e.target.checked)} />
        Only LinkedIn results
      </label>
      <div className="flex gap-3">
        <button className="rounded px-4 py-2 bg-blue-600 text-white disabled:opacity-50" onClick={search} disabled={busy}>
          {busy ? 'Searching…' : 'Find Job Links'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="divide-y">
          {results.map((r, i) => (
            <div key={i} className="py-3">
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-gray-500 truncate">{r.url}</div>
              {r.snippet && <div className="text-xs text-gray-600 mt-1">{r.snippet}</div>}
              <div className="mt-2 flex gap-2">
                <a className="text-sm underline" href={r.url} target="_blank" rel="noreferrer">Open</a>
                <button className="text-sm underline" onClick={()=>copy(r.url)}>Copy URL</button>
                <button className="text-sm underline" onClick={()=>onUseUrl(r.url)}>Use in Generator</button>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-500">{r.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
