'use client';
import { useState } from 'react';
import JobDescriptionFallback from '@/components/JobDescriptionFallback';
import FindJobLinks from '@/components/FindJobLinks';

function isLinkedIn(url?: string) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'lnkd.in' || /(^|\.)linkedin\.com$/.test(h);
  } catch { return false; }
}

export default function GenerateKitPage() {
  const [url, setUrl] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | undefined>(undefined);
  const [showFinder, setShowFinder] = useState(false);

  async function callExtract(payload: { url?: string; jdText?: string }) {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      if (json.code === 'BLOCKED_EXTRACTION') {
        console.warn('BLOCKED_EXTRACTION → showing paste UI', payload);
        setBlocked(true);
        setLastUrl(payload.url);
        return null;
      }
      throw new Error(json.message || 'Extraction failed');
    }
    return json.data as { description: string };
  }

  async function proceedWithResumeKit({ jd, sourceUrl }: { jd: string; sourceUrl?: string }) {
    // TODO: hook into your existing pipeline:
    // - parse JD
    // - tailor resume from master + JD
    // - generate 1-page CL
    // - show progress UI
    console.log('Proceeding with JD', { len: jd.length, sourceUrl });
  }

  const onSubmitUrl = async () => {
    if (!url.trim()) return;
    if (isLinkedIn(url)) {            // pre-empt LinkedIn
      setBlocked(true);
      setLastUrl(url);
      return;
    }
    const data = await callExtract({ url });
    if (!data) return; // blocked → paste UI rendered
    await proceedWithResumeKit({ jd: data.description, sourceUrl: url });
  };

  const onSubmitPastedJD = async (jdText: string) => {
    const data = await callExtract({ jdText, url: lastUrl });
    if (!data) return;
    await proceedWithResumeKit({ jd: data.description, sourceUrl: lastUrl });
    setBlocked(false);
  };

  const handleUseUrlFromFinder = (pickedUrl: string) => {
    setUrl(pickedUrl);
    if (isLinkedIn(pickedUrl)) {
      setBlocked(true);
      setLastUrl(pickedUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 space-y-3">
        <label className="text-sm font-medium">Job posting URL</label>
        <div className="flex gap-2">
          <input className="flex-1 rounded border p-2" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)} />
          <button className="rounded px-4 py-2 bg-blue-600 text-white" onClick={onSubmitUrl}>Generate</button>
        </div>
        <button className="text-sm underline" onClick={()=>setShowFinder(v=>!v)}>
          {showFinder ? 'Hide' : 'Find job links'}
        </button>
        {showFinder && <FindJobLinks onUseUrl={handleUseUrlFromFinder} />}
      </div>

      {blocked && (
        <JobDescriptionFallback
          onSubmit={onSubmitPastedJD}
          onDismiss={() => setBlocked(false)}
          asModal={true}
        />
      )}
    </div>
  );
}
