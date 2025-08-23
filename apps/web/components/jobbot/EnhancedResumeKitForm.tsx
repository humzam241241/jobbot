'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/ui/FileUpload";
import ModelSelector from "@/components/ui/ModelSelector";
import UsagePill from "@/components/ui/UsagePill";
import ErrorDetails from "@/components/ErrorDetails";
import { createDevLogger } from "@/lib/utils/devLogger";
import { toast } from "react-hot-toast";
import { safePostForm, ApiError } from "@/lib/utils/apiErrorHandler";

const logger = createDevLogger("ui:resumeKitForm");

type Provider = 'openai' | 'anthropic' | 'google' | 'auto';

interface ApiError {
  ok: false;
  id?: string;
  code?: string;
  message?: string;
  provider?: string;
  model?: string;
  attempts?: Array<{
    provider: string;
    code: string;
    message: string;
    status?: number;
    retryAfter?: number;
    preview?: string;
  }>;
  preview?: string;
}

interface ApiSuccess {
  ok: true;
  id: string;
  providerUsed?: string;
  fallbackUsed?: boolean;
  attempts?: any[];
  result: any;
  usage?: any;
}

export default function EnhancedResumeKitForm() {
  const router = useRouter();
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("auto");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [usageData, setUsageData] = useState<any>(null);

  // Handle model selection change
  const handleModelChange = (provider: Provider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    logger.info(`Selected ${provider}/${model}`);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      if (!selectedFile) {
        setError({
          ok: false,
          code: 'MISSING_FILE',
          message: 'Please select a resume file'
        });
        setIsLoading(false);
        return;
      }

      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.append("resume", selectedFile);
      formData.append("provider", selectedProvider);
      formData.append("model", selectedModel);
      
      const jdText = formData.get("jdText") as string;
      if (!jdText?.trim()) {
        setError({
          ok: false,
          code: 'MISSING_JD',
          message: 'Please enter a job description'
        });
        setIsLoading(false);
        return;
      }

      try {
        // Use our safe form post utility with enhanced error handling
        const data = await safePostForm("/api/resume/generate", formData);
        
        // Log successful response for debugging
        logger.info('API response received', {
          ok: data.ok,
          hasUsage: !!data.usage,
          hasKitId: !!data.kitId,
          provider: data.provider
        });
        
        if (data.ok) {
          setResult(data);
          if (data.usage) {
            setUsageData(data.usage);
          }
          
          // Show loading toast
          toast.loading("Finalizing your resume kit...");
          
          // Redirect to the result page
          if (data.kitId) {
            router.push(`/jobbot/result/${data.kitId}`);
          } else {
            // Fallback to the old way if kitId is not available
            setResult(data);
          }
        } else {
          logger.error('API returned error response', {
            error: data.error
          });
          setError(data);
          toast.error(data.error?.message || "Failed to generate resume kit");
        }
      } catch (err: any) {
        // Enhanced error handling for API errors
        if (err instanceof ApiError) {
          logger.error("API error:", {
            status: err.status,
            code: err.code,
            message: err.message,
            details: err.details
          });
          
          setError({
            ok: false,
            code: err.code || 'API_ERROR',
            message: err.message,
            details: err.details
          });
          
          // Show error toast with specific message
          toast.error(err.message || 'Failed to generate resume kit');
        } else {
          // Generic error handling
          logger.error("Error submitting form:", err);
          
          setError({
            ok: false,
            code: 'REQUEST_FAILED',
            message: err.message || 'Failed to send request'
          });
          
          toast.error('An unexpected error occurred. Please try again.');
        }
      }
    } catch (err: any) {
      setError({
        ok: false,
        code: 'UNEXPECTED_ERROR',
        message: err.message || 'An unexpected error occurred'
      });
      logger.error("Error in onSubmit:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-white">
      {/* Upload */}
      <FileUpload
        name="resume"
        accept=".pdf,.docx"
        maxSize={5 * 1024 * 1024}
        label="Upload your resume (PDF or DOCX)"
        onChange={setSelectedFile}
      />

      {/* Job Description */}
      <div className="space-y-2">
        <label htmlFor="jdText" className="block text-sm font-medium text-gray-200">
          Job Description
        </label>
        <textarea
          id="jdText"
          name="jdText"
          rows={6}
          className="mt-1 block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Paste the job description here..."
          required
        ></textarea>
      </div>

      {/* Optional Job URL */}
      <div className="space-y-2">
        <label htmlFor="jdUrl" className="block text-sm font-medium text-gray-200">
          Job URL (optional)
        </label>
        <input
          type="url"
          id="jdUrl"
          name="jdUrl"
          className="mt-1 block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="https://example.com/job-posting"
        />
      </div>

      {/* AI Model Selection */}
      <ModelSelector
        defaultProvider={selectedProvider}
        defaultModel={selectedModel}
        onChange={handleModelChange}
        disabled={isLoading}
      />

      {/* Error display */}
      {error && (
        <div className="space-y-4">
          <ErrorDetails 
            error={error}
            onRetry={() => {
              const form = document.querySelector("form") as HTMLFormElement;
              form.requestSubmit();
            }}
          />
          
          {/* Rate limit helper */}
          {error.attempts?.some(a => a.code === 'RATE_LIMIT') && (
            <div className="rounded-md border border-orange-500/40 bg-orange-950/30 p-3">
              <div className="text-sm text-orange-300">
                <span className="font-medium">Tip:</span> Rate limit hit. Try selecting a different provider manually.
              </div>
              <div className="mt-2 flex gap-2">
                {['openai', 'anthropic', 'google'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      handleModelChange(p as Provider, selectedModel);
                      const form = document.querySelector("form") as HTMLFormElement;
                      form.requestSubmit();
                    }}
                    className="text-xs rounded px-2 py-1 bg-orange-900/50 hover:bg-orange-900/70 text-orange-200 transition-colors capitalize"
                  >
                    Try {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success via fallback */}
      {result?.fallbackUsed && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-950/30 p-3">
          <div className="text-sm text-emerald-300">
            <span className="font-medium">Success!</span> Used fallback provider: {result.providerUsed}
          </div>
        </div>
      )}

      {/* Submit Button and Usage */}
      <div className="flex justify-between items-center">
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Generating Resume Kit..." : "Generate Resume Kit"}
        </button>
        
        {usageData && <UsagePill initialUsage={usageData} className="ml-4" />}
      </div>

      {/* Results */}
      {result?.ok && (
        <div className="space-y-4 p-4 border border-emerald-500 rounded-lg bg-emerald-900/10">
          <h3 className="text-lg font-medium text-emerald-400">Resume Kit Generated!</h3>
          
          <div className="text-xs text-gray-400">Trace ID: {result.id}</div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Resume</h4>
              <div className="flex flex-wrap gap-2">
                <a 
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-medium text-white transition-colors" 
                  href={result.result.resumePdf} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View PDF
                </a>
                {result.result.resumeDocx && (
                  <a 
                    className="px-3 py-2 border border-emerald-500 hover:bg-emerald-900/30 rounded-md text-sm font-medium text-emerald-300 transition-colors" 
                    href={result.result.resumeDocx} 
                    download
                  >
                    Download DOCX
                  </a>
                )}
              </div>
            </div>
            
            {result.result.coverLetterPdf && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Cover Letter</h4>
                <div className="flex flex-wrap gap-2">
                  <a 
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium text-white transition-colors" 
                    href={result.result.coverLetterPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View PDF
                  </a>
                  {result.result.coverLetterDocx && (
                    <a 
                      className="px-3 py-2 border border-purple-500 hover:bg-purple-900/30 rounded-md text-sm font-medium text-purple-300 transition-colors" 
                      href={result.result.coverLetterDocx} 
                      download
                    >
                      Download DOCX
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}