import { v4 as uuidv4 } from 'uuid';

// Use dynamic imports for Node.js modules to ensure they only run on the server
let fs: any = null;
let path: any = null;
if (typeof window === 'undefined') {
  // Only import on the server side
  fs = require('fs');
  path = require('path');
}

// Keep track of the last 100 errors
const MAX_ERROR_LOGS = 100;
const errorLogs: Array<{
  id: string;
  timestamp: string;
  level: string;
  message: string;
  details?: any;
  stack?: string;
}> = [];

// Redact sensitive information from logs
const redactSensitiveInfo = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'api', 'auth',
    'credential', 'jwt', 'session', 'cookie'
  ];

  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  Object.keys(result).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive key
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      // Recursively check nested objects
      result[key] = redactSensitiveInfo(result[key]);
    }
  });

  return result;
};

// Generate a unique ID for each request for tracing
const generateTraceId = () => {
  return uuidv4().split('-')[0];
};

const writeToFile = (level: string, message: string, details?: any) => {
  // Skip file operations on the client side
  if (typeof window !== 'undefined' || !fs || !path) {
    return;
  }
  
  try {
    const debugDir = path.join(process.cwd(), '..', '..', 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const logFile = path.join(debugDir, `${level}.log`);
    const timestamp = new Date().toISOString();
    const detailsStr = details ? JSON.stringify(redactSensitiveInfo(details), null, 2) : '';
    
    fs.appendFileSync(
      logFile, 
      `[${timestamp}] ${message}\n${detailsStr ? detailsStr + '\n' : ''}\n`
    );
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
};

// Store error logs in memory for the /api/debug/last-errors endpoint
const storeErrorLog = (level: string, message: string, details?: any, stack?: string) => {
  const id = generateTraceId();
  const timestamp = new Date().toISOString();
  
  errorLogs.unshift({
    id,
    timestamp,
    level,
    message,
    details: redactSensitiveInfo(details),
    stack
  });
  
  // Keep only the last MAX_ERROR_LOGS errors
  if (errorLogs.length > MAX_ERROR_LOGS) {
    errorLogs.pop();
  }
  
  return id;
};

// Client-side safe logger fallback
export const clientLogger = {
  debug: (message: string, details?: any) => {
    console.debug(`[DEBUG] ${message}`, details ? redactSensitiveInfo(details) : '');
    return generateTraceId();
  },
  info: (message: string, details?: any) => {
    console.info(`[INFO] ${message}`, details ? redactSensitiveInfo(details) : '');
    return generateTraceId();
  },
  warn: (message: string, details?: any) => {
    console.warn(`[WARN] ${message}`, details ? redactSensitiveInfo(details) : '');
    return generateTraceId();
  },
  error: (message: string, details?: any, error?: Error) => {
    console.error(`[ERROR] ${message}`, details ? redactSensitiveInfo(details) : '', error || '');
    return generateTraceId();
  },
  critical: (message: string, details?: any, error?: Error) => {
    console.error(`[CRITICAL] ${message}`, details ? redactSensitiveInfo(details) : '', error || '');
    return generateTraceId();
  },
  getLastErrors: () => {
    return [];
  }
};

export const logger = {
  debug: (message: string, details?: any) => {
    console.debug(`[DEBUG] ${message}`, details ? redactSensitiveInfo(details) : '');
    writeToFile('debug', message, details);
    return generateTraceId();
  },
  
  info: (message: string, details?: any) => {
    console.info(`[INFO] ${message}`, details ? redactSensitiveInfo(details) : '');
    writeToFile('info', message, details);
    return generateTraceId();
  },
  
  warn: (message: string, details?: any) => {
    console.warn(`[WARN] ${message}`, details ? redactSensitiveInfo(details) : '');
    writeToFile('warn', message, details);
    const id = storeErrorLog('warn', message, details);
    return id;
  },
  
  error: (message: string, details?: any, error?: Error) => {
    console.error(`[ERROR] ${message}`, details ? redactSensitiveInfo(details) : '', error || '');
    writeToFile('error', message, { ...details, stack: error?.stack });
    const id = storeErrorLog('error', message, details, error?.stack);
    return id;
  },
  
  critical: (message: string, details?: any, error?: Error) => {
    console.error(`[CRITICAL] ${message}`, details ? redactSensitiveInfo(details) : '', error || '');
    writeToFile('critical', message, { ...details, stack: error?.stack });
    const id = storeErrorLog('critical', message, details, error?.stack);
    return id;
  },
  
  // Get the last error logs for the debug endpoint
  getLastErrors: () => {
    return errorLogs;
  }
};

// Factory function to create a logger with a specific context
export function createLogger(context: string) {
  return {
    debug: (message: string, details?: any) => {
      return logger.debug(`[${context}] ${message}`, details);
    },
    info: (message: string, details?: any) => {
      return logger.info(`[${context}] ${message}`, details);
    },
    warn: (message: string, details?: any) => {
      return logger.warn(`[${context}] ${message}`, details);
    },
    error: (message: string, details?: any, error?: Error) => {
      return logger.error(`[${context}] ${message}`, details, error);
    },
    critical: (message: string, details?: any, error?: Error) => {
      return logger.critical(`[${context}] ${message}`, details, error);
    }
  };
}

export default logger;