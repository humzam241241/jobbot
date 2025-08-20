import { addError } from '@/app/api/debug/last-errors/route';
import { ErrorCode } from './zod';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Keys that should be redacted in logs
const SENSITIVE_KEYS = [
  'api_key',
  'apiKey',
  'key',
  'secret',
  'password',
  'token',
  'auth',
  'jwt',
];

/**
 * Redact sensitive information from objects
 */
function redactSensitiveInfo(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveInfo(item));
  }

  // Handle objects
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key contains sensitive information
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      // Redact the value
      result[key] = typeof value === 'string' ? '[REDACTED]' : '[REDACTED_OBJECT]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      result[key] = redactSensitiveInfo(value);
    } else {
      // Pass through non-sensitive values
      result[key] = value;
    }
  }

  return result;
}

/**
 * Create a logger instance with a specific prefix
 */
export function createLogger(prefix: string, telemetryId?: string) {
  const logWithLevel = (level: LogLevel, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const telemetryPrefix = telemetryId ? `[${telemetryId}] ` : '';
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}] [${prefix}] ${telemetryPrefix}`;
    
    // Redact sensitive information
    const safeData = data ? redactSensitiveInfo(data) : undefined;
    
    // Format the log message
    const logMessage = `${logPrefix}${message}${safeData ? ' ' + JSON.stringify(safeData) : ''}`;
    
    // Log to console with appropriate level
    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        
        // Add to error buffer if this is an error
        if (process.env.NODE_ENV === 'development' && safeData?.code) {
          try {
            addError({
              code: safeData.code,
              message: message,
              details: safeData,
              telemetryId,
              path: safeData.path,
            });
          } catch (e) {
            // Ignore errors when adding to buffer
          }
        }
        break;
    }
  };

  return {
    debug: (message: string, data?: any) => logWithLevel('debug', message, data),
    info: (message: string, data?: any) => logWithLevel('info', message, data),
    warn: (message: string, data?: any) => logWithLevel('warn', message, data),
    error: (message: string, data?: any) => logWithLevel('error', message, data),
    
    // Helper for API errors
    apiError: (code: ErrorCode, message: string, details?: any) => {
      logWithLevel('error', message, { code, ...details });
      return {
        ok: false,
        code,
        message,
        details,
        telemetryId,
      };
    },
  };
}

// Default logger instance
export const logger = createLogger('app');
