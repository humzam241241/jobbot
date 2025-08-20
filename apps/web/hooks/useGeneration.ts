'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Generation phases
export type Phase = 'idle' | 'validating' | 'generating' | 'rendering' | 'done' | 'error';

// Error details
export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
}

// Generation result
export interface GenerationResult {
  artifacts: {
    coverLetterMd: string;
    resumeMd: string;
    pdfs: Array<{
      name: string;
      url: string;
    }>;
  };
  usedProvider: string;
  telemetryId: string;
  processingTime?: number;
  timestamp?: string;
}

// Generation options
export interface GenerationOptions {
  jobDescription: {
    jobUrl?: string;
    jobPostingUrl?: string;
    jobDescriptionText?: string;
  };
  resumeText?: string;
  providerPreference?: 'openai' | 'anthropic' | 'google' | 'auto';
  model?: string;
}

// Generation progress
export interface GenerationProgress {
  phase: Phase;
  progress: number; // 0-100
  error?: ErrorDetails;
  result?: GenerationResult;
  retryCount: number;
  lastRetryTime?: number;
}

/**
 * Custom hook for managing resume generation state and logic
 */
export function useGeneration() {
  // State
  const [state, setState] = useState<GenerationProgress>({
    phase: 'idle',
    progress: 0,
    retryCount: 0,
  });
  
  // Reset state
  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      progress: 0,
      retryCount: 0,
    });
  }, []);
  
  // Handle errors
  const handleError = useCallback((error: ErrorDetails) => {
    console.error('Generation error:', error);
    
    setState(prev => ({
      ...prev,
      phase: 'error',
      error,
    }));
    
    // Show error toast
    toast.error(`Error: ${error.message}`, {
      duration: 5000,
    });
  }, []);
  
  // Retry logic
  const retry = useCallback(async () => {
    setState(prev => {
      // Don't retry if we're already generating
      if (prev.phase === 'generating' || prev.phase === 'validating' || prev.phase === 'rendering') {
        return prev;
      }
      
      // Check retry count
      if (prev.retryCount >= 3) {
        return {
          ...prev,
          error: {
            code: 'MAX_RETRIES',
            message: 'Maximum retry attempts reached',
          },
        };
      }
      
      // Check if we need to wait before retrying
      const now = Date.now();
      const lastRetry = prev.lastRetryTime || 0;
      const timeSinceLastRetry = now - lastRetry;
      const backoffTime = Math.pow(2, prev.retryCount) * 1000; // Exponential backoff
      
      if (timeSinceLastRetry < backoffTime) {
        const waitTime = Math.ceil((backoffTime - timeSinceLastRetry) / 1000);
        toast.error(`Please wait ${waitTime} seconds before retrying`);
        return prev;
      }
      
      // Reset for retry
      return {
        ...prev,
        phase: 'validating',
        progress: 0,
        error: undefined,
        retryCount: prev.retryCount + 1,
        lastRetryTime: now,
      };
    });
  }, []);
  
  // Generate resume kit
  const generate = useCallback(async (options: GenerationOptions) => {
    // Validate options
    if (
      !options.jobDescription.jobDescriptionText && 
      !options.jobDescription.jobUrl && 
      !options.jobDescription.jobPostingUrl
    ) {
      handleError({
        code: 'VALIDATION',
        message: 'Job description is required',
      });
      return;
    }
    
    // Update state to validating
    setState(prev => ({
      ...prev,
      phase: 'validating',
      progress: 10,
      error: undefined,
    }));
    
    try {
      // Short delay to show validating state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update state to generating
      setState(prev => ({
        ...prev,
        phase: 'generating',
        progress: 30,
      }));
      
      // Make API request
      const response = await fetch('/api/generate-resume-kit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      // Parse response
      const data = await response.json();
      
      // Handle error response
      if (!response.ok || !data.ok) {
        handleError({
          code: data.code || 'UNKNOWN',
          message: data.message || 'An unknown error occurred',
          details: data.details,
        });
        return;
      }
      
      // Update state to rendering
      setState(prev => ({
        ...prev,
        phase: 'rendering',
        progress: 80,
      }));
      
      // Short delay to show rendering state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update state to done
      setState(prev => ({
        ...prev,
        phase: 'done',
        progress: 100,
        result: data,
      }));
      
      // Show success toast
      toast.success('Resume kit generated successfully!', {
        duration: 5000,
      });
      
      // Return the result
      return data;
    } catch (error: any) {
      handleError({
        code: 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
      });
    }
  }, [handleError]);
  
  // Download a file
  const downloadFile = useCallback((url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
  
  return {
    phase: state.phase,
    progress: state.progress,
    error: state.error,
    result: state.result,
    retryCount: state.retryCount,
    generate,
    retry,
    reset,
    downloadFile,
    isLoading: state.phase === 'validating' || state.phase === 'generating' || state.phase === 'rendering',
    isComplete: state.phase === 'done',
    isError: state.phase === 'error',
  };
}
