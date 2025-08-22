"use client";

import React, { useState } from "react";
import FileUpload from "@/components/ui/FileUpload";
import ErrorCard from "@/components/ui/ErrorCard";
import ModelSelector from "@/components/ui/ModelSelector";
import { createDevLogger } from "@/lib/utils/devLogger";

const logger = createDevLogger("ui:resumeKitForm");

interface GenerationResult {
  ok: boolean;
  traceId: string;
  links: {
    resumePdf: string;
    resumeDocx: string;
    coverLetterPdf?: string;
    coverLetterDocx?: string;
    atsReportPdf?: string;
  };
  score?: number;
}

type Provider = 'openai' | 'anthropic' | 'gemini' | 'auto';

export default function EnhancedResumeKitForm() {
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    hint?: string;
    provider?: string;
    model?: string;
    rawPreview?: string;
    baselineResumePdfBase64?: string;
    developerHint?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("auto");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">("error");

  // Handle model selection change
  const handleModelChange = (provider: Provider, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
    logger.info(`Selected ${provider}/${model}`);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorDetails(null);
    setIsLoading(true);
    setShowToast(false);
    setResult(null);

    try {
      if (!selectedFile) {
        setError("Please select a resume file");
        setIsLoading(false);
        return;
      }

      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.append("resume", selectedFile);
      
      const jdText = formData.get("jdText") as string;
      if (!jdText.trim()) {
        setError("Please enter a job description");
        setIsLoading(false);
        return;
      }
      
      const jdUrl = formData.get("jdUrl") as string;
      
      try {
        const response = await fetch("/api/resume/generate", {
          method: "POST",
          body: formData
        });
        
        const json = await response.json();
        
        if (json.ok) {
          // Success response
          setResult(json);
          
          // Show success toast
          setToastMessage("Resume kit generated successfully!");
          setToastType("success");
          setShowToast(true);
          
          // Auto-hide toast after 5 seconds
          setTimeout(() => setShowToast(false), 5000);
        } else {
          // Error response
          setError(json.message || "Failed to generate resume");
          
          // Set error details if available
          if (json.code) {
            setErrorDetails({
              code: json.code,
              hint: json.hint,
              provider: json.provider,
              model: json.model,
              rawPreview: json.rawPreview,
              developerHint: json.developerHint
            });
            
            // Show specific toast for TAILOR_JSON_PARSE_FAILED
            if (json.code === "TAILOR_JSON_PARSE_FAILED") {
              setToastMessage("Model returned non-JSON. Try again or pick a different model.");
              setToastType("error");
              setShowToast(true);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        logger.error("Error submitting form:", err);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      logger.error("Error in onSubmit:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Function to dismiss the toast notification
  function dismissToast() {
    setShowToast(false);
  }

  // Function to retry with a different provider
  function switchProvider() {
    // If current provider is OpenAI, switch to Anthropic, else switch to OpenAI
    const currentProvider = errorDetails?.provider?.toLowerCase() || "";
    
    if (currentProvider.includes("openai") || currentProvider.includes("gpt")) {
      handleModelChange("anthropic", "claude-3-5-sonnet-latest");
    } else if (currentProvider.includes("anthropic") || currentProvider.includes("claude")) {
      handleModelChange("gemini", "gemini-2.5-pro");
    } else {
      handleModelChange("openai", "gpt-4o-2024-05-13");
    }
    
    // Automatically submit the form with the new provider
    setTimeout(() => {
      const form = document.querySelector("form") as HTMLFormElement;
      form.requestSubmit();
    }, 100);
  }

  // Function to use baseline resume
  function useBaselineResume() {
    if (errorDetails?.baselineResumePdfBase64) {
      // Create a blob from the base64 data
      const byteCharacters = atob(errorDetails.baselineResumePdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Open the PDF in a new tab
      window.open(url, '_blank');
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
        selectedFile={selectedFile}
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

      {/* AI Model Selection using ModelSelector component */}
      <ModelSelector
        defaultProvider={selectedProvider}
        defaultModel={selectedModel}
        onChange={handleModelChange}
        disabled={isLoading}
      />

      {/* Hidden input for generation type - always generate full kit */}
      <input type="hidden" name="mode" value="both" />

      {/* Error display */}
      {error && !errorDetails && (
        <div className="rounded-lg border border-red-500 bg-red-900/20 p-3 text-red-300">
          {error}
        </div>
      )}

      {/* Enhanced error display */}
      {error && errorDetails && (
        <ErrorCard
          message={error}
          hint={errorDetails.hint}
          rawPreview={errorDetails.rawPreview}
          code={errorDetails.code}
          provider={errorDetails.provider}
          model={errorDetails.model}
          onRetry={() => {
            const form = document.querySelector("form") as HTMLFormElement;
            form.requestSubmit();
          }}
          onSwitchProvider={switchProvider}
          onUseBaseline={useBaselineResume}
          hasBaseline={!!errorDetails.baselineResumePdfBase64}
        />
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
      >
        {isLoading ? "Generating Resume Kit..." : "Generate Resume Kit"}
      </button>

      {/* Results */}
      {result?.ok && (
        <div className="space-y-4 p-4 border border-emerald-500 rounded-lg bg-emerald-900/10">
          <h3 className="text-lg font-medium text-emerald-400">Resume Kit Generated!</h3>
          
          <div className="text-xs text-gray-400">Trace ID: {result.traceId}</div>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Resume</h4>
              <div className="flex flex-wrap gap-2">
                <a 
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm font-medium text-white" 
                  href={result.links.resumePdf} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View PDF
                </a>
                <a 
                  className="px-3 py-2 border border-emerald-500 hover:bg-emerald-900/30 rounded-md text-sm font-medium text-emerald-300" 
                  href={result.links.resumeDocx} 
                  download
                >
                  Download DOCX
                </a>
              </div>
            </div>
            
            {result.links.coverLetterPdf && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Cover Letter</h4>
                <div className="flex flex-wrap gap-2">
                  <a 
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium text-white" 
                    href={result.links.coverLetterPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View PDF
                  </a>
                  {result.links.coverLetterDocx && (
                    <a 
                      className="px-3 py-2 border border-purple-500 hover:bg-purple-900/30 rounded-md text-sm font-medium text-purple-300" 
                      href={result.links.coverLetterDocx} 
                      download
                    >
                      Download DOCX
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {result.links.atsReportPdf && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">ATS Report</h4>
                <div className="flex flex-wrap gap-2">
                  <a 
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white" 
                    href={result.links.atsReportPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    View Report
                  </a>
                </div>
                {result.score !== undefined && (
                  <div className="mt-2">
                    <span className="text-sm">ATS Score: </span>
                    <span className={`font-medium ${
                      result.score >= 80 ? 'text-green-400' : 
                      result.score >= 60 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {result.score}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 ${
          toastType === 'error' ? 'bg-red-500 text-white' :
          toastType === 'success' ? 'bg-green-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {toastType === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {toastType === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {toastType === 'info' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
          <div>{toastMessage}</div>
          <button onClick={dismissToast} className="ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </form>
  );
}