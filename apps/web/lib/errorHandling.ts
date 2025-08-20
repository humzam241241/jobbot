import { logger } from './logger';

// Add server-only marker to ensure this is used correctly
export const isServer = typeof window === 'undefined';

export interface NetworkError {
  type: 'network';
  message: string;
  details?: string;
  code?: string;
  traceId?: string;
  retry?: boolean;
}

export interface ValidationError {
  type: 'validation';
  message: string;
  fields?: Record<string, string[]>;
  traceId?: string;
}

export interface ServerError {
  type: 'server';
  message: string;
  status: number;
  traceId?: string;
}

export interface UnknownError {
  type: 'unknown';
  message: string;
  original?: any;
  traceId?: string;
}

export type AppError = NetworkError | ValidationError | ServerError | UnknownError;

/**
 * Handles fetch errors and returns a standardized error object
 */
export async function handleFetchError(error: any, context?: string): Promise<AppError> {
  // Use appropriate logger based on environment
  const log = isServer ? logger : {
    error: (message: string, details?: any, error?: Error) => {
      console.error(`[ERROR] ${message}`, details || '', error || '');
      return Math.random().toString(36).substring(2, 8);
    }
  };

  // Network errors (ECONNRESET, etc)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    const traceId = log.error(`Network error in ${context || 'fetch request'}`, { 
      message: error.message 
    }, error);
    
    // Check for specific network errors
    if (error.message.includes('ECONNRESET')) {
      return {
        type: 'network',
        message: 'Connection was reset. The server may be overloaded.',
        details: 'Try again in a few moments or check your internet connection.',
        code: 'ECONNRESET',
        traceId,
        retry: true
      };
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        details: 'Check your internet connection and try again.',
        traceId,
        retry: true
      };
    }
    
    return {
      type: 'network',
      message: 'Network error occurred',
      details: error.message,
      traceId,
      retry: true
    };
  }
  
  // Response with error status
  if (error.status && error.json) {
    try {
      const data = await error.json();
      const traceId = log.error(`Server error in ${context || 'fetch request'}`, { 
        status: error.status,
        data
      });
      
      // Handle validation errors
      if (error.status === 400 && data.error?.code === 'invalid_input') {
        return {
          type: 'validation',
          message: data.error.message || 'Invalid input',
          fields: data.error.details,
          traceId: data.error.traceId || traceId
        };
      }
      
      // Handle other server errors
      return {
        type: 'server',
        message: data.error?.message || 'Server error occurred',
        status: error.status,
        traceId: data.error?.traceId || traceId
      };
    } catch (jsonError) {
      const traceId = log.error(`Failed to parse server error in ${context || 'fetch request'}`, {
        status: error.status
      }, jsonError as Error);
      
      return {
        type: 'server',
        message: `Server error (${error.status})`,
        status: error.status,
        traceId
      };
    }
  }
  
  // Unknown errors
  const traceId = log.error(`Unknown error in ${context || 'fetch request'}`, {}, error);
  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred',
    original: error,
    traceId
  };
}

/**
 * Retry a fetch operation with exponential backoff
 */
export async function retryFetch(
  url: string, 
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 1000
): Promise<Response> {
  // Use appropriate logger based on environment
  const log = isServer ? logger : {
    warn: (message: string, details?: any) => {
      console.warn(`[WARN] ${message}`, details || '');
      return Math.random().toString(36).substring(2, 8);
    },
    error: (message: string, details?: any, error?: Error) => {
      console.error(`[ERROR] ${message}`, details || '', error || '');
      return Math.random().toString(36).substring(2, 8);
    }
  };

  let lastError: any;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add attempt number to headers for tracking
      const headers = new Headers(options.headers || {});
      headers.append('X-Retry-Attempt', attempt.toString());
      
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (!response.ok) {
        throw response;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        log.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next attempt
      }
    }
  }
  
  // If we get here, all retries failed
  log.error(`All ${maxRetries} retry attempts failed`, { url }, lastError);
  throw lastError;
}

/**
 * Formats an error message for display to the user
 */
export function formatErrorMessage(error: AppError): string {
  switch (error.type) {
    case 'network':
      return `Network Error: ${error.message}${error.details ? ` - ${error.details}` : ''}`;
    
    case 'validation':
      return `Validation Error: ${error.message}`;
    
    case 'server':
      return `Server Error (${error.status}): ${error.message}`;
    
    case 'unknown':
    default:
      return `Error: ${error.message}`;
  }
}

/**
 * Returns a user-friendly suggestion based on the error type
 */
export function getErrorSuggestion(error: AppError): string {
  switch (error.type) {
    case 'network':
      return error.retry 
        ? 'Please check your internet connection and try again.'
        : 'Please try again later or contact support if the problem persists.';
    
    case 'validation':
      return 'Please check your input and try again.';
    
    case 'server':
      return error.status === 503 || error.status === 429
        ? 'The server is currently busy. Please try again in a few moments.'
        : 'Please try again later or contact support if the problem persists.';
    
    case 'unknown':
    default:
      return 'Please try again or contact support if the problem persists.';
  }
}

/**
 * Creates an error tracking ID for support
 */
export function getErrorTrackingInfo(error: AppError): string {
  return error.traceId 
    ? `Error ID: ${error.traceId}`
    : `Error occurred at ${new Date().toISOString()}`;
}
