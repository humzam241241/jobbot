"use client";

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { GenerationStep } from '@/lib/types/resume';
import GenerationStepper from '@/components/ui/GenerationStepper';
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLocalStorage } from "react-use";
import JobDescriptionFallback from '@/components/JobDescriptionFallback';
import { generateResumeKit } from '@/lib/client/api';

type Kit = {
  kitId: string;
  providerUsedResume: string;
  modelUsedResume: string;
  files: {
    resumePdfUrl: string;
    coverLetterPdfUrl: string;
    atsReportPdfUrl?: string;
  };
};

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
  const [generatedKit, setGeneratedKit] = useLocalStorage<Kit | null>("generatedKit", null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [provider, setProvider] = useState('auto');
  const [model, setModel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
  const [showJdFallback, setShowJdFallback] = useState(false);
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [providerInfo, setProviderInfo] = useState<{
    resumeProvider?: string;
    resumeModel?: string;
    coverProvider?: string;
    coverModel?: string;
  } | null>(null);
  
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

  // Check if the URL is from LinkedIn or other sites that block extraction
  const isBlockedSite = (url: string): boolean => {
    if (!url || url.trim() === '') return false;
    
    try {
      // Handle malformed URLs by trying to fix them
      let fixedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fixedUrl = 'https://' + url;
      }
      
      const hostname = new URL(fixedUrl).hostname.toLowerCase();
      return hostname.includes('linkedin.com') || 
             hostname.includes('indeed.com') ||
             hostname.includes('glassdoor.com');
    } catch (e) {
      console.error('URL parsing error:', e);
      // If URL is malformed but contains linkedin, indeed, or glassdoor, assume it's blocked
      const lowerUrl = url.toLowerCase();
      return lowerUrl.includes('linkedin.com') || 
             lowerUrl.includes('indeed.com') || 
             lowerUrl.includes('glassdoor.com');
    }
  };

  // Handle submission of pasted job description
  const handleJdSubmit = async (jdText: string) => {
    if (!jdText || jdText.trim().length < 30) {
      setError("Please provide a longer job description.");
      return;
    }
    
    setJobDescriptionText(jdText);
    setShowJdFallback(false);
    
    // Continue with the generation process using the pasted JD
    await processGeneration(undefined, jdText);
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

    // Check if the URL is from a site that blocks extraction
    if (jobUrl && isBlockedSite(jobUrl) && !jobDescriptionText) {
      setShowJdFallback(true);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    // Process with URL or existing job description text
    await processGeneration(jobUrl, jobDescriptionText);
  };
  
  // Shared processing logic for both URL and pasted JD paths
  const processGeneration = async (url?: string, jdText?: string) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    if (resumeFile) {
      formData.append("resumeFile", resumeFile);
    }
    formData.append("masterResumeText", masterResumeText);
    
    // Add either job URL or job description text
    // Always include jobUrl field even if empty to avoid validation issues
    formData.append("jobUrl", url || "");
    if (jdText) {
      formData.append("jobDescriptionText", jdText);
    }
    
    formData.append("notes", notes);
    formData.append("provider", provider); // Use selected provider
    if (model) {
      formData.append("model", model);
    }

    try {
      console.log("Submitting form data to generate resume kit");
      
      // Use the client API utility to make the request
      const result = await generateResumeKit(formData);
      
      console.log("API Success:", result);
      
      if (result.message) {
        setError(null);
        
        // Create a temporary kit object for display
        const tempKit = {
          kitId: result.received ? `test_${Date.now()}` : 'unknown',
          message: result.message,
          processingTime: result.processingTime,
          providerUsedResume: result.received?.provider || 'auto',
          modelUsedResume: result.received?.model || 'default',
          files: {
            resumePdfUrl: '#', // Placeholder for now
            coverLetterPdfUrl: '#', // Placeholder for now
            atsReportPdfUrl: '#' // Placeholder for now
          }
        };
        setGeneratedKit(tempKit);
        
        // Show success message
        console.log(`Resume generation test successful! Processed in ${result.processingTime}ms`);
      } else if (result.files) {
        // Handle file downloads
        setGeneratedKit(result);
        
        // Increment generation counter
        setGenerationCount((prev) => (prev || 0) + 1);
        
        // Create downloadable links for the generated files
        const downloadFile = (dataUrl: string, filename: string) => {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        
        // Download all files
        downloadFile(result.files.resumePdfUrl, result.files.resumeFileName || 'resume.pdf');
        downloadFile(result.files.coverLetterPdfUrl, result.files.coverLetterFileName || 'cover_letter.pdf');
        if (result.files.atsReportPdfUrl) {
          downloadFile(result.files.atsReportPdfUrl, result.files.atsReportFileName || 'ats_report.pdf');
        }
      }
    } catch (err: any) {
      console.error("Generation fetch error:", err);
      setError(`An unexpected error occurred: ${err.message}`);
      
      // Preserve job description text on error
      if (jdText) {
        setJobDescriptionText(jdText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-muted-foreground">Generate Resume Kit</h3>
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

        {/* Job Description Text - Always visible */}
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
        
        {error && !showJdFallback && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        
        {/* Job Description Fallback */}
        {showJdFallback && (
          <div className="my-4">
            <JobDescriptionFallback 
              onSubmit={handleJdSubmit}
              onDismiss={() => {
                setShowJdFallback(false);
                setJobUrl("");
              }}
              asModal={false}
              initialText={jobDescriptionText} // Pass any existing JD text
            />
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
          disabled={isLoading || showJdFallback}
        >
          {isLoading ? "Generating..." : "Generate Resume Kit"}
        </button>

        {generatedKit && (
          <div className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
            Successfully generated kit {generatedKit.kitId} using {generatedKit.providerUsedResume} ({generatedKit.modelUsedResume}).
          </div>
        )}
      </div>
    </div>
  );
}