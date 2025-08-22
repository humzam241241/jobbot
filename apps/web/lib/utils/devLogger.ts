// apps/web/lib/utils/devLogger.ts

/**
 * Creates a logger for development environment with structured output
 * @param scope The scope/context for the logger
 * @returns Logger object with various logging methods
 */
export function createDevLogger(scope: string) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    /**
     * Log an informational message
     * @param message Message to log
     * @param data Optional data to include
     */
    info: (message: string, data?: any) => {
      if (isDev) {
        console.log(`[DEV:${scope}] ${message}`, data || '');
      }
    },
    
    /**
     * Log a warning message
     * @param message Warning message
     * @param data Optional data to include
     */
    warn: (message: string, data?: any) => {
      if (isDev) {
        console.warn(`[DEV:${scope}] WARNING: ${message}`, data || '');
      }
    },
    
    /**
     * Log an error message
     * @param message Error message
     * @param error Optional error object
     */
    error: (message: string, error?: any) => {
      if (isDev) {
        console.error(`[DEV:${scope}] ERROR: ${message}`, error || '');
      }
    },
    
    /**
     * Log LLM response (truncated in production)
     * @param provider Provider name
     * @param model Model name
     * @param text Response text
     */
    llmResponse: (provider: string, model: string, text: string) => {
      if (isDev) {
        const preview = text.length > 400 ? `${text.substring(0, 400)}... (${text.length} chars)` : text;
        console.log(`[DEV:${scope}:llm] Response from ${provider}/${model}:\n${preview}`);
      }
    },
    
    /**
     * Generic log method (alias for info)
     */
    log: (message: string, data?: any) => {
      if (isDev) {
        console.log(`[DEV:${scope}] ${message}`, data || '');
      }
    }
  };
}