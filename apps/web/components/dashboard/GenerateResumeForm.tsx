"use client";
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import BackendStatusBadge from '@/components/BackendStatusBadge';

class DetailedHttpError extends Error {
  kind:"network"|"timeout"|"http"|"unknown"; status?:number; statusText?:string; url?:string;
  contentType?:string; bodySnippet?:string; correlationId?:string; durationMs?:number; online?:boolean;
  constructor(init: Partial<DetailedHttpError> & { message:string }) { super(init.message); Object.assign(this, init); this.name="DetailedHttpError"; }
}
const clip=(s:any,n=1200)=> (typeof s==="string"?s.slice(0,n):JSON.stringify(s, null, 2).slice(0,n));

// Function to extract text from uploaded files
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  // Handle text files directly
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await file.text();
  }
  
  // For PDF and DOCX files, try server-side processing first, then fallback
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || 
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    
    try {
      // Try server-side processing first
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.text) {
          return result.text;
        }
      } else {
        // Handle server error responses
        const errorResult = await response.json().catch(() => ({}));
        if (errorResult.error === 'PDF_PARSE_FAILED') {
          throw new Error(`${errorResult.message}\n\n${errorResult.suggestion}`);
        }
        if (errorResult.error === 'PDF_MANUAL_EXTRACTION_REQUIRED') {
          throw new Error(`${errorResult.message}\n\n${errorResult.instruction}`);
        }
      }
      
      // If server-side fails, show helpful error message
      throw new Error(`Unable to process ${fileName}. The file may be corrupted, password-protected, or contain only images. Please try:\n\n1. Opening the file and copying the text manually\n2. Converting to a text-based PDF\n3. Uploading a different format\n\nAlternatively, paste your resume text in the text area below.`);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unable to process')) {
        throw error; // Re-throw our helpful message
      }
      throw new Error(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}.\n\nPlease paste your resume text in the text area below instead.`);
    }
  }
  
  throw new Error(`Unsupported file type: ${fileType}.\n\nSupported formats: PDF, DOCX, TXT.\n\nPlease upload a supported file or paste your resume text in the text area below.`);
}

async function postJSON(path:string, body:any) {
  const t0=Date.now(), ctrl=new AbortController(), timer=setTimeout(()=>ctrl.abort(), 120000);
  try{
    const res=await fetch(path,{method:"POST",headers:{ "content-type":"application/json","idempotency-key":crypto.randomUUID?.()??String(Date.now())},body:JSON.stringify(body),signal:ctrl.signal});
    const ct=res.headers.get("content-type")||""; const cid=res.headers.get("x-correlation-id")||undefined; const text=await res.text(); const took=Date.now()-t0;
    let data:any; if(ct.includes("application/json")){ try{ data=JSON.parse(text);}catch{} }
    if(!res.ok || data?.ok===false) throw new DetailedHttpError({ message:data?.error||data?.message||`HTTP ${res.status}`, kind:"http", status:res.status, statusText:res.statusText, url:path, contentType:ct, bodySnippet:clip(data??text), correlationId:data?.correlationId||cid, durationMs:took });
    return { ...(data??{}), correlationId:cid, durationMs:took };
  }catch(e:any){
    if(e?.name==="AbortError") throw new DetailedHttpError({ message:"Request timed out (120s)", kind:"timeout", url:path, online:navigator.onLine });
    if(e instanceof DetailedHttpError) throw e;
    throw new DetailedHttpError({ message:e?.message||"Network error", kind:"network", url:path, online:navigator.onLine });
  }finally{ clearTimeout(timer); }
}

// Helper types and functions (can be moved to a utils file)
type Kit = {
  id: string;
  createdAt: number;
  files: { resumePdfUrl?: string; coverLetterPdfUrl?: string };
  texts: { resumeHtml?: string; coverHtml?: string; atsReport?: string; jobSummary?: string };
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number; model?: string; provider?: string };
  backend?: string;
  jobUrl?: string;
  model?: string;
  provider?: string;
  notes?: string;
};

type OutputState = {
  type: 'success' | 'error';
  title: string;
  details: any;
  kit?: Kit; // Add kit to the success state
} | null;

// New component to render the success state
function GenerationResult({ kit, originalProvider, originalModel }: { kit: Kit; originalProvider: string; originalModel: string; }) {
  const { files, texts, usage } = kit;

  const providerUsed = usage?.provider || kit.provider;
  const modelUsed = usage?.model || kit.model;

  const providerFallback = providerUsed && providerUsed !== originalProvider;
  const modelFallback = modelUsed && modelUsed !== originalModel;

  async function downloadPdf(htmlContent: string | undefined, fileName: string) {
    if (!htmlContent) {
      alert("No content available to generate PDF.");
      return;
    }

    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent, fileName }),
      });

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Download PDF error:", error);
      alert("Sorry, there was an error generating your PDF. Please try again.");
    }
  }

  return (
    <div className="md:col-span-2 p-3 border border-emerald-700 bg-emerald-950 text-emerald-100 rounded-lg space-y-3">
      <h3 className="font-semibold text-emerald-400">✅ Resume Kit Generated Successfully!</h3>

      <div className="text-sm">
        <b>📄 Downloads:</b>
        <div className="pl-2">
          {kit.files.resumePdfUrl && (
            <a href={kit.files.resumePdfUrl} download="resume.pdf" target="_blank" rel="noopener" className="text-emerald-300 hover:underline">⬇ Resume PDF</a>
          )}
          {kit.files.coverLetterPdfUrl && (
            <span className="ml-2">
              · <a href={kit.files.coverLetterPdfUrl} download="cover-letter.pdf" target="_blank" rel="noopener" className="text-emerald-300 hover:underline">⬇ Cover Letter PDF</a>
            </span>
          )}
          {(kit.files as any).atsPdfUrl && (
            <span className="ml-2">
              · <a href={(kit.files as any).atsPdfUrl} download="ats-report.pdf" target="_blank" rel="noopener" className="text-emerald-300 hover:underline">⬇ ATS Report PDF</a>
            </span>
          )}
        </div>
      </div>

      <div className="text-sm">
        <b>👁 Previews:</b>
        <div className="pl-2">
          {texts?.resumeHtml && (
            <a href={`data:text/html;charset=utf-8,${encodeURIComponent(texts.resumeHtml)}`} target="_blank" rel="noopener" className="text-emerald-300 hover:underline">Resume HTML</a>
          )}
          {texts?.coverHtml && (
            <span className="ml-2">
             · <a href={`data:text/html;charset=utf-8,${encodeURIComponent(texts.coverHtml)}`} target="_blank" rel="noopener" className="text-emerald-300 hover:underline">Cover Letter HTML</a>
            </span>
          )}
          {texts?.atsReport && (
            <span className="ml-2">
              · <a href={`data:text/html;charset=utf-8,${encodeURIComponent(texts.atsReport)}`} target="_blank" rel="noopener" className="text-emerald-300 hover:underline">ATS Report</a>
            </span>
          )}
        </div>
      </div>

      {texts?.atsReport && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-emerald-400">📊 ATS Compatibility Report</summary>
          <div className="mt-2 p-2 bg-emerald-950/50 rounded max-h-60 overflow-y-auto text-xs" dangerouslySetInnerHTML={{ __html: texts.atsReport }} />
        </details>
      )}

      <div className="text-xs opacity-80 border-t border-emerald-800 pt-2">
        <b>Usage:</b> {usage.inputTokens || 0} in · {usage.outputTokens || 0} out · {usage.totalTokens || 0} total<br />
        <b>Model:</b> {modelUsed} · <b>Provider:</b> {providerUsed}
      </div>

      {providerFallback && (
        <div className="text-xs opacity-80">
          ℹ Provider fallback: requested <code>{originalProvider}</code> → used <code>{providerUsed}</code>
        </div>
      )}
      {modelFallback && (
        <div className="text-xs opacity-80">
          ℹ Model fallback: requested <code>{originalModel}</code> → used <code>{modelUsed}</code>
        </div>
      )}
    </div>
  );
}


type ProgressStep = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
};

// Progress indicator component
function ProgressIndicator({ steps }: { steps: ProgressStep[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="w-full bg-white/5 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Generation Progress</h3>
        <span className="text-xs text-neutral-400">
          {steps.filter(s => s.status === 'completed').length} / {steps.length} completed
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold
              ${step.status === 'completed' ? 'bg-emerald-500 text-white' : 
                step.status === 'active' ? 'bg-blue-500 text-white animate-pulse' :
                step.status === 'error' ? 'bg-red-500 text-white' :
                'bg-white/10 text-white/50'}`}>
              {step.status === 'completed' ? '✓' : 
               step.status === 'error' ? '✗' : 
               step.status === 'active' ? '•' : index + 1}
            </div>
            <span className={`text-sm ${
              step.status === 'completed' ? 'text-emerald-400' :
              step.status === 'active' ? 'text-blue-400' :
              step.status === 'error' ? 'text-red-400' :
              'text-white/50'}`}>
              {step.label}
            </span>
            {step.status === 'active' && (
              <div className="ml-auto">
                <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// A new, dedicated component for the provider status
function ProviderStatus() {
  const [status, setStatus] = useState("Checking providers…");

  useEffect(() => {
    fetch('/api/diagnostics/providers')
      .then(r => r.json())
      .then(d => {
        if (d) {
          const providers = ['openai', 'anthropic', 'openrouter', 'google'];
          const statusIcons = providers.map(provider => {
            const result = d[provider];
            let icon = '❌';
            if (result?.ok) icon = '✅';
            else if (result?.reason === 'over_quota') icon = '🚫';
            else if (result?.reason === 'missing_key') icon = '⛔';
            else if (result?.reason === 'network_error') icon = '🌐';
            
            return `${provider.charAt(0).toUpperCase() + provider.slice(1)}: ${icon}`;
          });
          setStatus(`Providers — ${statusIcons.join(' · ')}`);
        } else {
          setStatus("Provider check failed.");
        }
      })
      .catch(() => {
        setStatus("Could not connect to check provider status.");
      });
  }, []); // Empty dependency array means this runs once on the client after mount

  return <div id="provider-status" style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>{status}</div>;
}

export default function GenerateResumeForm({ freeTierNote }: { freeTierNote: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [output, setOutput] = useState<OutputState>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [progress, setProgress] = useState<ProgressStep[]>([]);

  // QR Code generation effect
  useEffect(() => {
    async function generateQr() {
      if (typeof window !== 'undefined') {
        try {
          const url = await QRCode.toDataURL(window.location.href, { width: 128, margin: 1, color: { dark: '#ffffff', light: '#101010' } });
          setQrCodeDataUrl(url);
        } catch (err) {
          console.error('QR code generation failed', err);
        }
      }
    }
    generateQr();
  }, []);


  async function handleGenerateClick(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const jobUrl = formData.get('jobUrl') as string;
    const provider = (document.getElementById("ai-provider") as HTMLSelectElement)?.value || "auto";
    const model = (document.getElementById("ai-model") as HTMLSelectElement)?.value || "gpt-4o-mini";
    const notes = formData.get('notes') as string;
    const resumeTextarea = (form.querySelector("#resumeText") as HTMLTextAreaElement)?.value || "";
    const resumeFile = formData.get('file') as File | null;

    // Get master resume content from either file or textarea
    let masterResume = resumeTextarea;
    
    // If a file is uploaded, process it to extract text
    if (resumeFile && resumeFile.size > 0) {
      try {
        masterResume = await extractTextFromFile(resumeFile);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setOutput({ 
          type: 'error', 
          title: 'File processing failed', 
          details: errorMessage
        });
        return;
      }
    }

    setOutput(null);
    if (!jobUrl?.trim()) {
      setOutput({ type: 'error', title: 'Job URL is required', details: 'Please paste a job posting URL to continue.' });
      return;
    }

    if (!masterResume?.trim()) {
      setOutput({ 
        type: 'error', 
        title: 'Resume content is required', 
        details: 'Please upload a resume file or paste your resume text in the textarea above.' 
      });
      return;
    }

    // Initialize progress steps
    const steps: ProgressStep[] = [
      { id: 'validate', label: 'Validating inputs', status: 'active' },
      { id: 'scrape', label: 'Analyzing job posting', status: 'pending' },
      { id: 'generate', label: 'AI generating content', status: 'pending' },
      { id: 'pdf', label: 'Creating PDF documents', status: 'pending' },
      { id: 'complete', label: 'Finalizing results', status: 'pending' }
    ];
    setProgress(steps);

    const updateProgress = (stepId: string, status: ProgressStep['status']) => {
      setProgress(prev => prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      ));
    };

    setSubmitting(true);
    
    try {
      // Step 1: Validate
      await new Promise(resolve => setTimeout(resolve, 300));
      updateProgress('validate', 'completed');
      updateProgress('scrape', 'active');
      // Step 2-4: AI Generation (this happens on the server)
      updateProgress('generate', 'active');
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProgress('pdf', 'active');
      
      const data = await postJSON("/api/resume-kit", { jobUrl, model, provider, masterResume, notes });
      
      // Step 5: Complete
      updateProgress('pdf', 'completed');
      updateProgress('complete', 'active');
      await new Promise(resolve => setTimeout(resolve, 200));
      updateProgress('complete', 'completed');

      const kit: Kit = {
        id: data.kitId || `kit_${Date.now()}`,
        createdAt: Date.now(),
        files: data.files || {},
        texts: data.texts || {},
        usage: data.usage || { model, provider, totalTokens: 0 },
        backend: data.backend || "web",
        jobUrl, model, provider, notes
      };

      const prev = JSON.parse(localStorage.getItem("resume_kits") || "[]");
      localStorage.setItem("resume_kits", JSON.stringify([kit, ...prev].slice(0, 200)));

      setOutput({
        type: 'success',
        title: `✅ Resume Kit Generated Successfully!`,
        details: 'Your tailored resume, cover letter, and ATS report are ready.',
        kit: kit,
      });

    } catch (err: any) {
      const e = err as DetailedHttpError;
      
      // Mark the current step as error
      setProgress(prev => prev.map(step => 
        step.status === 'active' ? { ...step, status: 'error' } : step
      ));
      
      // Enhanced error detection and debugging
      console.log("Error details:", { 
        message: e.message, 
        bodySnippet: e.bodySnippet, 
        status: e.status,
        kind: e.kind 
      });
      
      // Check for specific quota error codes
      if (e.status === 429 || (e.bodySnippet && typeof e.bodySnippet === 'string' && e.bodySnippet.includes('INSUFFICIENT_QUOTA'))) {
        const providerName = e.message.includes('OpenAI') ? 'OpenAI' : 
                           e.message.includes('Anthropic') ? 'Anthropic' : 
                           e.message.includes('Google') ? 'Google Gemini' : 
                           e.message.includes('OpenRouter') ? 'OpenRouter' : 'AI Provider';
        setOutput({
          type: 'error',
          title: `${providerName} Quota Reached`,
          details: `You have run out of credits or hit the rate limit for your ${providerName} account. Please check your plan and billing details on their website. If you believe this is an error, try again in a few moments.`
        });
      } else if (e.bodySnippet && typeof e.bodySnippet === 'string' && e.bodySnippet.includes('NO_MODEL_KEY')) {
        setOutput({
          type: 'error',
          title: 'Missing API Key',
          details: 'No AI provider API keys are configured. Please add at least one API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or OPENROUTER_API_KEY) to the server environment variables.'
        });
      } else {
        setOutput({
          type: 'error',
          title: `${e.kind === "timeout" ? "Timeout" : e.kind === "network" ? "Network error" : "HTTP error"}: ${e.message}`,
          details: clip(e)
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="resumeForm" onSubmit={handleGenerateClick} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      <div className="md:col-span-2 flex justify-between items-center">
          <div>
          <h2 className="text-xl font-semibold tracking-tight">Your Master Resume</h2>
          {freeTierNote && <p className="text-sm text-neutral-400 mt-1" dangerouslySetInnerHTML={{ __html: freeTierNote }} />}
          </div>
        <BackendStatusBadge />
        </div>

      <div className="rounded-2xl bg-card border border-border shadow-soft">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-muted-foreground">Generate Resume Kit</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-background/40 hover:bg-background/60 transition-colors">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">
                Drag & drop your resume here, or click to select
                <br/> <span className="opacity-80">Supported: PDF, DOCX, TXT</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
            placeholder="Paste your resume text here…"
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Job Posting URL</label>
            <input
              type="url"
              inputMode="url"
              className="w-full rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
              placeholder="Paste any job posting URL (e.g., company site, Lever, Greenhouse, Workday, LinkedIn)"
            />
            <p className="text-[11px] text-muted-foreground/80">We'll extract job descriptions from most websites.</p>
          </div>
          <textarea
            className="min-h-[80px] w-full resize-y rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
            placeholder="Any special instructions or focus areas…"
          />
          <button
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring/70 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Generate Resume Kit
          </button>
        </div>
      </div>
              <div className="md:col-span-2">
        <label className="block">
          <span className="text-sm font-medium">AI Provider & Model</span>
          <div className="flex mt-1">
            <select id="ai-provider" defaultValue="auto" style={{ marginRight: 8 }} className="...">
              <option value="auto">Auto (best available)</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter (DeepSeek)</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google Gemini</option>
            </select>
            <select id="ai-model" defaultValue="gpt-4o-mini" className="...">
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="o3-mini">o3-mini</option>
                </select>
              </div>
        </label>
        <script dangerouslySetInnerHTML={{__html: `
        (function(){
          const provider = document.getElementById('ai-provider');
          const model = document.getElementById('ai-model');
          const SETS = {
            openai: [["gpt-4o","GPT-4o (Quality)"],["gpt-4o-mini","GPT-4o Mini (Fast)"]],
            openrouter: [["openai/gpt-4o-mini","OpenAI GPT-4o Mini"], ["deepseek/deepseek-chat","DeepSeek Chat (Creative)"], ["google/gemini-flash-1.5","Google Gemini Flash 1.5"]],
            anthropic: [["claude-3-5-sonnet-20240620","Claude 3.5 Sonnet (Latest)"],["claude-3-haiku-20240307","Claude 3 Haiku (Fast)"]],
            google: [["gemini-1.5-pro-latest","Gemini 1.5 Pro"],["gemini-1.5-flash-latest","Gemini 1.5 Flash"]],
            auto: [["auto","Default (Auto)"]]
          };
          function refill(p){
            while(model.firstChild) model.removeChild(model.firstChild);
            (SETS[p]||SETS.auto).forEach(([v,l])=>{
              const opt=document.createElement('option'); opt.value=v; opt.textContent=l; model.appendChild(opt);
            });
          }
          provider?.addEventListener('change',()=>refill(provider.value||'auto'));
        })();`}} />
        <ProviderStatus />
      </div>
      <div className="md:col-span-2">
        <label className="block">
          <span className="text-sm font-medium">Job URL</span>
          <input type="url" id="job-url" name="jobUrl" required className="mt-1 block w-full text-sm border border-white/10 rounded-lg bg-white/5 p-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="https://www.linkedin.com/jobs/view/..." disabled={submitting} />
        </label>
              </div>
      <div className="md:col-span-2">
        <label className="block">
          <span className="text-sm font-medium">Notes (optional)</span>
          <textarea id="notes" name="notes" rows={2} className="mt-1 block w-full text-sm border border-white/10 rounded-lg bg-white/5 p-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Any special instructions..." disabled={submitting}></textarea>
        </label>
            </div>

      <div className="md:col-span-2">
        <button
          id="generate-btn"
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-500 text-white font-semibold px-6 py-3 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            "Generate Resume Kit"
          )}
            </button>
          </div>

      {/* Progress Indicator */}
      {submitting && (
        <div className="md:col-span-2">
          <ProgressIndicator steps={progress} />
        </div>
      )}

      {/* RENDER OUTPUTS HERE using React state */}
      {output && output.type === 'success' && output.kit && (
        <GenerationResult 
          kit={output.kit} 
          originalProvider={(document.getElementById("ai-provider") as HTMLSelectElement)?.value || "auto"}
          originalModel={(document.getElementById("ai-model") as HTMLSelectElement)?.value || "gpt-4o-mini"}
        />
      )}

      {output && output.type === 'error' && (
        <div className="md:col-span-2 p-4 border border-red-700 bg-red-950 text-red-100 rounded-lg">
          <p className="font-semibold text-red-400 mb-2">{output.title}</p>
          {output.details && (
            <div className="text-sm">
              <pre className="whitespace-pre-wrap text-red-200 leading-relaxed">
                {typeof output.details === 'string' ? output.details : JSON.stringify(output.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
