import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('pdf-error-handler');

/**
 * Custom error class for PDF generation errors
 */
export class PDFGenerationError extends Error {
  public code: string;
  public details?: any;
  public component?: string;
  public traceId: string;

  constructor(message: string, options: {
    code?: string;
    details?: any;
    component?: string;
    cause?: Error;
  } = {}) {
    super(message);
    this.name = 'PDFGenerationError';
    this.code = options.code || 'PDF_GEN_ERROR';
    this.details = options.details;
    this.component = options.component;
    this.cause = options.cause;
    this.traceId = Math.random().toString(36).substring(2, 10);
    
    // Log the error immediately
    this.logError();
  }

  /**
   * Log the error with details
   */
  private logError() {
    logger.error(`PDF Generation Error: ${this.message}`, {
      code: this.code,
      component: this.component,
      details: this.details,
      traceId: this.traceId,
      cause: this.cause ? (this.cause as Error).message : undefined
    }, this.cause as Error);
    
    // Save error details to debug file
    try {
      const debugDir = path.join(process.cwd(), '..', '..', 'debug', 'pdf-errors');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const errorDetails = {
        timestamp: new Date().toISOString(),
        message: this.message,
        code: this.code,
        component: this.component,
        details: this.details,
        traceId: this.traceId,
        stack: this.stack,
        cause: this.cause ? {
          message: (this.cause as Error).message,
          stack: (this.cause as Error).stack
        } : undefined
      };
      
      fs.writeFileSync(
        path.join(debugDir, `error_${this.traceId}_${Date.now()}.json`),
        JSON.stringify(errorDetails, null, 2)
      );
    } catch (err) {
      logger.warn('Failed to save error details to debug file', { error: err });
    }
  }

  /**
   * Get a user-friendly error message
   */
  public getUserMessage(): string {
    switch (this.code) {
      case 'REACT_RENDER_ERROR':
        return 'Failed to render the resume component. Please try again.';
      case 'PDF_CONVERSION_ERROR':
        return 'Failed to convert HTML to PDF. Please try again.';
      case 'FILE_SYSTEM_ERROR':
        return 'Failed to save the PDF file. Please try again.';
      case 'BROWSER_LAUNCH_ERROR':
        return 'Failed to launch the browser for PDF generation. Please try again.';
      default:
        return 'An error occurred during PDF generation. Please try again.';
    }
  }
}

/**
 * Wrapper function to handle errors in PDF generation
 */
export async function withPdfErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    component?: string;
    fallback?: T;
  } = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Wrap the error in our custom error class if it's not already
    if (!(error instanceof PDFGenerationError)) {
      throw new PDFGenerationError(
        error.message || 'Unknown PDF generation error',
        {
          code: error.code || 'UNKNOWN_ERROR',
          details: error.details || error,
          component: options.component,
          cause: error
        }
      );
    }
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Create a fallback PDF with error information
 */
export function createErrorPdf(error: Error): Buffer {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error Generating PDF</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
          }
          .error-container {
            border: 1px solid #f44336;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .error-title {
            color: #f44336;
            margin-top: 0;
          }
          .error-message {
            font-weight: bold;
          }
          .error-details {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            margin-top: 20px;
          }
          .error-trace {
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1 class="error-title">Error Generating PDF</h1>
          <p class="error-message">${error.message}</p>
          <p>There was an error generating your PDF. Please try again or contact support if the issue persists.</p>
          ${error instanceof PDFGenerationError ? `<p>Error Code: ${error.code}</p>` : ''}
          ${error instanceof PDFGenerationError && error.traceId ? `<p class="error-trace">Trace ID: ${error.traceId}</p>` : ''}
        </div>
        <div class="error-details">
          ${error.stack?.replace(/\n/g, '<br>') || 'No stack trace available'}
        </div>
      </body>
    </html>
  `;
  
  // Return the HTML as a buffer
  return Buffer.from(errorHtml);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    component?: string;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const initialDelayMs = options.initialDelayMs || 500;
  const maxDelayMs = options.maxDelayMs || 5000;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Log retry attempt
      logger.warn(`PDF generation attempt ${attempt + 1}/${maxRetries} failed`, {
        component: options.component,
        error: error.message,
        attempt: attempt + 1,
        maxRetries
      });
      
      // Don't wait on the last attempt
      if (attempt < maxRetries - 1) {
        // Calculate delay with exponential backoff
        const delayMs = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );
        
        // Add some jitter
        const jitteredDelayMs = delayMs * (0.75 + Math.random() * 0.5);
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, jitteredDelayMs));
      }
    }
  }
  
  // All retries failed
  throw new PDFGenerationError(
    `Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    {
      code: 'RETRY_EXHAUSTED',
      component: options.component,
      cause: lastError || undefined
    }
  );
}
