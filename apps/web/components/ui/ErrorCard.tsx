// apps/web/components/ui/ErrorCard.tsx
"use client";

import React, { useState } from "react";

interface ErrorCardProps {
  title?: string;
  message: string;
  hint?: string;
  code?: string;
  provider?: string;
  model?: string;
  rawPreview?: string;
  stage?: string;
  onRetry?: () => void;
  onSwitchProvider?: () => void;
}

/**
 * Component for displaying detailed error information
 */
export default function ErrorCard({
  title = "Error",
  message,
  hint,
  code,
  provider,
  model,
  rawPreview,
  stage,
  onRetry,
  onSwitchProvider
}: ErrorCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="rounded-lg border border-red-500 bg-red-900/20 p-4 text-red-300 space-y-3">
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg">{title}</h3>
        {(code || provider || model) && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-red-400 hover:text-red-300 flex items-center"
          >
            {showDetails ? "Hide details" : "Show details"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ml-1 transition-transform ${showDetails ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
      
      <p>{message}</p>
      
      {hint && <p className="text-sm">{hint}</p>}
      
      {showDetails && (
        <div className="space-y-3">
          {(code || provider || model || stage) && (
            <div className="text-xs text-red-400 space-y-1">
              {code && <div>Error code: {code}</div>}
              {stage && <div>Stage: {stage}</div>}
              {provider && <div>Provider: {provider}</div>}
              {model && <div>Model: {model}</div>}
            </div>
          )}
          
          {rawPreview && (
            <div className="bg-red-900/30 p-2 rounded text-xs font-mono max-h-32 overflow-auto">
              <p className="font-bold mb-1">Raw LLM Output Preview:</p>
              <pre className="whitespace-pre-wrap break-all">{rawPreview}</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mt-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm rounded border border-red-400 text-red-300 hover:bg-red-800/50"
          >
            Retry
          </button>
        )}
        
        {onSwitchProvider && code === "TAILORING_FAILED" && (
          <button
            onClick={onSwitchProvider}
            className="px-3 py-1 text-sm rounded border border-red-400 text-red-300 hover:bg-red-800/50"
          >
            Try Different AI Provider
          </button>
        )}
      </div>
    </div>
  );
}