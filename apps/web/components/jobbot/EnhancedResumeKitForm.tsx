"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { GenerationStep } from '@/lib/types/resume';
import GenerationStepper from '@/components/ui/GenerationStepper';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocalStorage } from "react-use";

interface FileUrls {
  publicUrl: string;
  apiUrl: string;
  fileName: string;
}

interface GeneratedFiles {
  resumePdf: FileUrls;
  resumeDocx: FileUrls;
  coverPdf: FileUrls;
  coverDocx: FileUrls;
  atsPdf: FileUrls;
}

interface GenerationResult {
  ok: boolean;
  traceId: string;
  files: GeneratedFiles;
}

const GENERATION_STEPS: GenerationStep[] = [
  {
    id: 'parse',
    label: 'Parse Files',
    description: 'Extracting content from uploaded files',
    status: 'pending'
  },
  {
    id: 'analyze',
    label: 'Analyze Content',
    description: 'Processing resume and job description',
    status: 'pending'
  },
  {
    id: 'tailor',
    label: 'Tailor Content',
    description: 'Customizing resume for the job',
    status: 'pending'
  },
  {
    id: 'format',
    label: 'Format Documents',
    description: 'Optimizing layout and styling',
    status: 'pending'
  },
  {
    id: 'ats',
    label: 'ATS Analysis',
    description: 'Calculating match score and suggestions',
    status: 'pending'
  },
  {
    id: 'generate',
    label: 'Generate Files',
    description: 'Creating final documents',
    status: 'pending'
  }
];

export default function EnhancedResumeKitForm() {
  const [masterResumeText, setMasterResumeText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [provider, setProvider] = useState('auto');
  const [model, setModel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  
  // Generation counter
  const [generationCount, setGenerationCount] = useLocalStorage<number>("generationCount", 0);

  // Available models per provider (keep small, can be expanded)
  const MODEL_SETS: Record<string, { value: string; label: string }[]> = {
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
    anthropic: [
      { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    gemini: [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    openrouter: [
      { value: 'openai/gpt-4o-mini', label: 'OpenRouter · OpenAI GPT-4o Mini' },
      { value: 'deepseek/deepseek-chat', label: 'OpenRouter · DeepSeek Chat' },
    ],
  };

  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0]);
      setError(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleDrop, multiple: false });

  const updateStepStatus = (stepId: string, status: GenerationStep['status'], progress?: number, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, progress, error }
        : step
    ));
  };

  const handleGenerate = async () => {
    if (!resumeFile && !masterResumeText) {
      setError("Please upload a resume file or paste your resume text.");
      return;
    }
    if (!jobUrl && !jobDescriptionText) {
      setError("Please provide a job posting URL or paste the job description.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGenerationResult(null);
    
    try {
      const formData = new FormData();
      if (resumeFile) {
        formData.append("resumeFile", resumeFile);
      }
      formData.append("masterResumeText", masterResumeText);
      formData.append("jobUrl", jobUrl || "");
      if (jobDescriptionText) {
        formData.append("jobDescriptionText", jobDescriptionText);
      }
      formData.append("notes", notes);
      formData.append("provider", provider);
      if (model) {
        formData.append("model", model);
      }

      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Resume generation failed');
      }
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || 'Resume generation failed');
      }

      setGenerationResult(result);
      setGenerationCount((prev) => (prev || 0) + 1);
      setCurrentStep('done');
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDownloadButtons = () => {
    if (!generationResult) return null;

    const { files, traceId } = generationResult;
    return (
      <div className="space-y-6 mt-6">
        <div className="text-xs text-gray-500">Trace ID: {traceId}</div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resume */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Tailored Resume</h4>
            <div className="flex flex-col gap-2">
              <a 
                href={files.resumePdf.publicUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
              >
                View Resume (PDF)
              </a>
              <a 
                href={files.resumeDocx.publicUrl}
                download
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
              >
                Download Resume (DOCX)
              </a>
              <div className="text-xs text-center text-gray-500">
                <a href={files.resumePdf.apiUrl} className="hover:underline">PDF fallback</a>
                {" · "}
                <a href={files.resumeDocx.apiUrl} className="hover:underline">DOCX fallback</a>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Cover Letter</h4>
            <div className="flex flex-col gap-2">
              <a 
                href={files.coverPdf.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
              >
                View Cover Letter (PDF)
              </a>
              <a 
                href={files.coverDocx.publicUrl}
                download
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
              >
                Download Cover Letter (DOCX)
              </a>
              <div className="text-xs text-center text-gray-500">
                <a href={files.coverPdf.apiUrl} className="hover:underline">PDF fallback</a>
                {" · "}
                <a href={files.coverDocx.apiUrl} className="hover:underline">DOCX fallback</a>
              </div>
            </div>
          </div>
        </div>

        {/* ATS Report */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2">ATS Analysis</h4>
          <div className="flex flex-col gap-2">
            <a 
              href={files.atsPdf.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center hover:bg-blue-700"
            >
              View ATS Report (PDF)
            </a>
            <div className="text-xs text-center text-gray-500">
              <a href={files.atsPdf.apiUrl} className="hover:underline">PDF fallback</a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-muted-foreground">Resume Generator</h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-background/40 hover:bg-background/60 transition-colors cursor-pointer"
        >
          <input {...getInputProps()} />
          <div className="text-center text-xs text-muted-foreground">
            {resumeFile ? (
              <span>Selected file: {resumeFile.name}</span>
            ) : (
              <>
                Drag & drop your resume here, or click to select <br />
                <span className="opacity-80">Supported: PDF, DOCX, TXT</span>
              </>
            )}
          </div>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Master resume text area */}
        <textarea
          className="min-h-[120px] w-full resize-y rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
          placeholder="Paste your resume text here…"
          value={masterResumeText}
          onChange={(e) => setMasterResumeText(e.target.value)}
        />

        {/* Job URL */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Job Posting URL</label>
          <input
            type="url"
            inputMode="url"
            className="w-full rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
            placeholder="Paste any job posting URL (e.g., company site, Lever, Greenhouse, Workday, LinkedIn)"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
        </div>

        {/* Job Description Text */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {jobUrl ? "Extracted/Pasted Job Description" : "Paste Job Description"}
          </label>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
            placeholder="For best results, paste the complete job description text here..."
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground/80">
            Adding a detailed job description helps create more tailored resumes and cover letters.
          </p>
        </div>

        {/* AI Provider Selection */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">AI Provider</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                className="w-full rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setModel(''); // Reset model when provider changes
                }}
              >
                <option value="auto">Auto (Best Available)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <select
                className="w-full rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={provider === 'auto'}
              >
                <option value="">Default Model</option>
                {provider !== 'auto' && MODEL_SETS[provider]?.map(modelOption => (
                  <option key={modelOption.value} value={modelOption.value}>
                    {modelOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <textarea
          className="min-h-[80px] w-full resize-y rounded-xl bg-background/40 border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60"
          placeholder="Any special instructions or focus areas…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Generation Counter */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Generations: {generationCount || 0}</span>
          <span>{isLoading ? "Processing..." : ""}</span>
        </div>

        {/* Button */}
        <button
          className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring/70 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Resume Kit"}
        </button>

        {/* Download Buttons */}
        {renderDownloadButtons()}
      </div>
    </div>
  );
}