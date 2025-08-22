/**
 * Simple logger implementation
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Creates a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
  return {
    info(message: string, meta?: Record<string, any>) {
      console.info(`[${component}] INFO: ${message}`, meta || '');
    },
    
    warn(message: string, meta?: Record<string, any>) {
      console.warn(`[${component}] WARN: ${message}`, meta || '');
    },
    
    error(message: string, meta?: Record<string, any>) {
      console.error(`[${component}] ERROR: ${message}`, meta || '');
    },
    
    debug(message: string, meta?: Record<string, any>) {
      if (process.env.DEBUG === 'true') {
        console.debug(`[${component}] DEBUG: ${message}`, meta || '');
      }
    }
  };
}