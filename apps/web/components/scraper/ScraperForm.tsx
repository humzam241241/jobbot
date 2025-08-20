"use client";
import { useState } from 'react'

interface ScraperFormProps {
  onSearch?: (data: any) => void | Promise<void>;
}

export default function ScraperForm({ onSearch }: ScraperFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const fd = new FormData(e.currentTarget)
      const res = await fetch('/api/scrape', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Scraping failed')
      }
      if (typeof onSearch === 'function') {
        await onSearch(data);
      } else {
        console.warn('ScraperForm: onSearch prop not provided.');
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6 text-neutral-100 shadow-sm">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Job Scraper</h2>
      <p className="text-sm text-neutral-400">Aggregate from popular sources with filters</p>
      
      <form onSubmit={submit} className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium">Sources</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-2">
              {['LinkedIn', 'Indeed', 'Glassdoor', 'Greenhouse', 'Lever', 'Custom'].map(source => (
                <label key={source} htmlFor={`source-${source}`} className="flex items-center gap-2 text-sm">
                  <input id={`source-${source}`} name="sources" type="checkbox" defaultChecked={['LinkedIn', 'Indeed', 'Greenhouse'].includes(source)} className="rounded text-emerald-500 focus:ring-emerald-400/50" />
                  <span>{source}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium">Location</label>
            <input id="location" name="location" type="text" defaultValue="Canada" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50" />
          </div>
          
          <div>
            <label className="block text-sm font-medium">Work mode</label>
            <div className="flex items-center gap-2 mt-2">
              {['any', 'remote', 'hybrid', 'onsite'].map(mode => (
                <label key={mode} htmlFor={`workMode-${mode}`} className="flex items-center gap-2 text-sm capitalize">
                  <input id={`workMode-${mode}`} name="workMode" type="radio" value={mode} defaultChecked={mode === 'any'} className="text-emerald-500 focus:ring-emerald-400/50" />
                  <span>{mode}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="titleIncludes" className="block text-sm font-medium">Title includes</label>
            <input id="titleIncludes" name="titleIncludes" type="text" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50" placeholder="e.g., mechanical engineering intern" />
          </div>

          <div>
            <label htmlFor="titleExcludes" className="block text-sm font-medium">Title excludes</label>
            <input id="titleExcludes" name="titleExcludes" type="text" className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50" placeholder="e.g., Senior, Principal" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-60">
            {loading ? 'Searching...' : 'Run now'}
          </button>
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-50">
            Schedule (soon)
          </button>
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-50">
            Save defaults (soon)
          </button>
          <p className="text-xs text-neutral-400">
            Last run: never
          </p>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      </form>
    </section>
  )
}



