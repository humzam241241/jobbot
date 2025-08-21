import { useState, useCallback } from 'react';
import { retryFetch, handleFetchError, AppError, isServer } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { useTokens } from './useTokens';

// Create a browser-safe console logger as fallback
const clientLogger = {
  info: (message: string, details?: any) => {
    console.info(`[INFO] ${message}`, details || '');
    return Math.random().toString(36).substring(2, 8); // Generate a simple ID
  },
  warn: (message: string, details?: any) => {
    console.warn(`[WARN] ${message}`, details || '');
    return Math.random().toString(36).substring(2, 8);
  },
  error: (message: string, details?: any, error?: Error) => {
    console.error(`[ERROR] ${message}`, details || '', error || '');
    return Math.random().toString(36).substring(2, 8);
  },
  debug: (message: string, details?: any) => {
    console.debug(`[DEBUG] ${message}`, details || '');
    return Math.random().toString(36).substring(2, 8);
  }
};

interface ResumeGenerationOptions {
  onProgress?: (step: string, message: string) => void;
  maxRetries?: number;
}

export interface ResumeGenerationResult {
  kitId: string;
  providerUsed: string;
  modelUsed: string;
  files: {
    resumePdfUrl: string;
    coverLetterPdfUrl: string;
    atsReportPdfUrl?: string;
  };
}

export function useResumeGeneration(options: ResumeGenerationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [result, setResult] = useState<ResumeGenerationResult | null>(null);
  const { useToken, tokensRemaining, error: tokenError } = useTokens();
  
  const { onProgress, maxRetries = 3 } = options;

  const generateResume = useCallback(async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    // Check if we have tokens available
    if (tokensRemaining <= 0) {
      setError({
        code: 'TOKEN_LIMIT',
        message: 'You have reached your daily generation limit. Please try again tomorrow.',
        hint: 'The limit resets at midnight.',
        status: 429
      });
      setIsLoading(false);
      return null;
    }
    
    // Use appropriate logger based on environment
    const log = isServer ? logger : clientLogger;
    
    const traceId = log.info("Starting resume generation", {
      provider: formData.get('provider'),
      model: formData.get('model'),
      hasResumeFile: !!formData.get('resumeFile'),
      hasJobUrl: !!formData.get('jobUrl')
    });
    
    try {
      // Try multiple endpoints in sequence with retry logic
      const endpoints = [
        "/api/resume/generate",
        "/api/generate",
        "/api/resume-generate"
      ];
      
      // Create a copy of the form data entries
      const formDataEntries = Array.from(formData.entries());
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          onProgress?.('request', `Trying endpoint: ${endpoint}`);
          
          // Create a new FormData object for each request
          const newFormData = new FormData();
          formDataEntries.forEach(([key, value]) => {
            newFormData.append(key, value);
          });
          
          // Add trace ID for tracking
          newFormData.append('traceId', traceId);
          
          // Use retry fetch with exponential backoff
          response = await retryFetch(endpoint, {
            method: "POST",
            body: newFormData,
          }, maxRetries);
          
          // If successful, break out of the loop
          if (response.ok) {
            log.info(`Successful response from ${endpoint}`, { traceId });
            break;
          }
        } catch (endpointError: any) {
          lastError = endpointError;
          log.warn(`Endpoint ${endpoint} failed`, { error: endpointError }, endpointError instanceof Error ? endpointError : undefined);
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All endpoints failed');
      }
      
      // Process the successful response
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error?.message || 'Unknown error occurred');
      }
      
      // Update progress
      onProgress?.('complete', 'Generation completed successfully');
      
      // Deduct a token
      await useToken();
      
      // Set the result
      setResult({
        kitId: data.kitId,
        providerUsed: data.providerUsed || formData.get('provider') as string || 'auto',
        modelUsed: data.modelUsed || formData.get('model') as string || 'default',
        files: {
          resumePdfUrl: data.files.resumePdfUrl,
          coverLetterPdfUrl: data.files.coverLetterPdfUrl,
          atsReportPdfUrl: data.files.atsReportPdfUrl
        }
      });
      
      log.info("Resume generation completed successfully", { 
        kitId: data.kitId,
        traceId
      });
      
      return data;
    } catch (error: any) {
      const appError = await handleFetchError(error, 'resume generation');
      setError(appError);
      
      log.error("Resume generation failed", { 
        error: appError,
        traceId
      });
      
      onProgress?.('error', appError.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onProgress, maxRetries]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    generateResume,
    isLoading,
    error: error || tokenError ? { ...error, tokenError } : null,
    result,
    reset,
    tokensRemaining
  };
}
