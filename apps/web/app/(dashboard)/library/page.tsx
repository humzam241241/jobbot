"use client";
import { useEffect, useState } from "react";
import { SectionCard } from '@/components/ui/SectionCard';
import { TrackToggle } from '@/components/ui/TrackToggle';

type Kit = {
  id: string;
  createdAt: number;
  files: { resumePdfUrl?: string; coverLetterPdfUrl?: string };
  texts?: { resumeHtml?: string; coverHtml?: string; jobSummary?: string };
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number; model?: string; provider?: string };
  backend?: string;
  jobUrl?: string;
  model?: string;
  provider?: string;
  notes?: string;
};

export default function LibraryPage() {
  const [kits, setKits] = useState<Kit[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("resume_kits");
      setKits(raw ? JSON.parse(raw) : []);
    } catch {
      setKits([]);
    }
  }, []);

  const openHtml = (html?: string) => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  };

  const clearLib = () => { localStorage.setItem("resume_kits", "[]"); setKits([]); };

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Library</h1>
        <button 
          onClick={clearLib} 
          className="px-3 py-1.5 rounded-lg border border-border bg-background/40 hover:bg-background/60 text-sm"
        >
          Clear
        </button>
      </div>
      {kits.length === 0 ? (
        <div className="text-muted-foreground">No resume kits yet. Generate one from the Dashboard.</div>
      ) : (
        <ul className="list-none p-0 m-0 grid gap-4">
          {kits.map((k) => (
            <li key={k.id} className="border border-border rounded-xl p-4 bg-card">
              <div className="flex justify-between items-center">
                <div className="font-bold">
                  Kit #{k.id.slice(-6)} · {new Date(k.createdAt).toLocaleString()}
                </div>
                <TrackToggle 
                  sourceType="library" 
                  sourceId={k.id} 
                  title={k.jobUrl ? `Resume for ${new URL(k.jobUrl).hostname}` : "Resume Kit"} 
                  company={k.jobUrl ? new URL(k.jobUrl).hostname.replace('www.', '') : undefined} 
                />
              </div>
              {k.jobUrl && (
                <div className="mt-2">
                  Job: <a href={k.jobUrl} target="_blank" rel="noopener" className="text-primary hover:underline">{k.jobUrl}</a>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {k.files?.resumePdfUrl && (
                  <a href={k.files.resumePdfUrl} download target="_blank" rel="noopener" className="text-primary hover:underline">
                    Download Resume (PDF)
                  </a>
                )}
                {k.files?.coverLetterPdfUrl && (
                  <a href={k.files.coverLetterPdfUrl} download target="_blank" rel="noopener" className="text-primary hover:underline">
                    Download Cover Letter (PDF)
                  </a>
                )}
                <button 
                  onClick={()=>openHtml(k.texts?.resumeHtml)} 
                  className="px-2 py-1 rounded-lg border border-border bg-background/40 hover:bg-background/60 text-sm"
                >
                  Preview Resume
                </button>
                <button 
                  onClick={()=>openHtml(k.texts?.coverHtml)} 
                  className="px-2 py-1 rounded-lg border border-border bg-background/40 hover:bg-background/60 text-sm"
                >
                  Preview Cover
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Backend: {k.backend || "web"} · Provider: {k.usage?.provider || k.provider || "—"} · Model: {k.usage?.model || k.model || "—"} ·
                &nbsp;Tokens — in: {k.usage?.inputTokens ?? 0} · out: {k.usage?.outputTokens ?? 0} · total: {k.usage?.totalTokens ?? 0}
              </div>
              {k.texts?.jobSummary && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Job summary</summary>
                  <div className="mt-2 text-sm">{k.texts.jobSummary}</div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
