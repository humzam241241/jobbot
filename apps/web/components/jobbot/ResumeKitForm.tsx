"use client";
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { API_URL } from '@/lib/api';

type Step = 'Idle' | 'Analyzing JD' | 'Tailoring' | 'Formatting' | 'Done';

export default function ResumeKitForm() {
  const [jobUrl, setJobUrl] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [qr, setQr] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('Idle');
  const [usageLeft, setUsageLeft] = useState(50);
  const [preview, setPreview] = useState<{score:number; keywords:string[]}|null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tone, setTone] = useState('Professional');
  const [format, setFormat] = useState('Concise');
  const [model, setModel] = useState('gpt-4o-mini');
  const canGenerate = !!jobUrl && (!!resumeText || !!file);

  useMemo(() => {
    const url = `${API_URL}/ai/generate`;
    QRCode.toDataURL(url, { width: 160, margin: 0 }, (err, dataUrl) => {
      if (!err && dataUrl) setQr(dataUrl);
    });
  }, []);

  async function onGenerate() {
    if (!canGenerate || busy) return;
    try {
      setBusy(true); setStep('Analyzing JD');
      const form = new FormData();
      form.append('jobUrl', jobUrl);
      if (resumeText) form.append('resumeText', resumeText);
      if (notes) form.append('notes', notes);
      if (file) form.append('resume', file);
      form.append('tone', tone);
      form.append('format', format);
      form.append('model', model);
      setStep('Tailoring');
      const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      const res = await fetch(`${API_URL}/ai/generate`, { method: 'POST', headers: jwt?{ Authorization:`Bearer ${jwt}` }:{}, body: form as any });
      setStep('Formatting');
      const j = await res.json();
      setStep('Done');
      setUsageLeft((v)=>Math.max(0, v-1));
      if (j?.ats) setPreview({ score: j.ats.publicScore ?? 0, keywords: (j.ats?.breakdown ?? []).slice(0,5)});
    } catch (e) {
      setStep('Idle');
      alert('Generation failed. Check API and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-800 bg-white/[0.03] p-4 backdrop-blur">
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-400">Job URL</label>
            <input className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" placeholder="https://..." value={jobUrl} onChange={e=>setJobUrl(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Resume (paste text)</label>
            <textarea rows={6} className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" value={resumeText} onChange={e=>setResumeText(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <input type="file" accept=".pdf,.docx,.txt" onChange={e=>setFile(e.target.files?.[0]??null)} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Notes (optional)</label>
            <input className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>
          <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
            <div className="mb-2 text-sm text-slate-400">Upload from phone</div>
            {qr && <img src={qr} alt="QR" width={160} height={160} />}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-white/[0.03] p-4 backdrop-blur">
        <div className="space-y-4">
          <button aria-label="Generate" className="button disabled:opacity-60" disabled={!canGenerate || busy} onClick={onGenerate}>{busy? 'Working…':'Generate'}</button>
          <div>
            <div className="text-sm text-slate-400 mb-1">Usage</div>
            <div className="h-2 w-full rounded bg-slate-800 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(usageLeft/50)*100}%` }} /></div>
            <div className="mt-1 text-xs text-slate-400">Free tier: {usageLeft}/50 left</div>
          </div>
          <button
            className="text-sm text-indigo-400 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            aria-expanded={showAdvanced}
            onClick={()=>setShowAdvanced(v=>!v)}
          >
            Advanced options
          </button>
          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm text-slate-400">Model</label>
                    <select className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" value={model} onChange={e=>setModel(e.target.value)}>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                      <option value="gpt-4o">gpt-4o</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Tone</label>
                    <select className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" value={tone} onChange={e=>setTone(e.target.value)}>
                      <option>Professional</option>
                      <option>Friendly</option>
                      <option>Technical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Formatting length</label>
                    <select className="mt-1 w-full rounded-lg border border-slate-700 bg-black/30 px-3 py-2 outline-none" value={format} onChange={e=>setFormat(e.target.value)}>
                      <option>Concise</option>
                      <option>Balanced</option>
                      <option>Detailed</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <div className="text-sm text-slate-400 mb-1">Progress</div>
            <div className="flex gap-2 text-xs">
              {(['Idle','Analyzing JD','Tailoring','Formatting','Done'] as Step[]).map(s=> (
                <span key={s} className={`rounded-full px-2 py-1 ${step===s? 'bg-indigo-600 text-white':'bg-slate-800 text-slate-300'}`}>{s}</span>
              ))}
            </div>
          </div>
          {preview && (
            <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
              <div className="mb-2 text-sm text-slate-400">ATS Preview</div>
              <div className="text-lg font-semibold">{preview.score}%</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.keywords.map(k=> <span key={k} className="rounded-full bg-slate-800 px-2 py-1 text-xs">{k}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


