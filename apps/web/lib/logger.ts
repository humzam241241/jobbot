/**
 * Enhanced logger implementation with structured logging
 */
export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;
}

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  meta?: Record<string, any>;
}

/**
 * Creates a logger instance for a specific component
 */
export function createLogger(component: string): Logger {
  function formatError(error: any): Record<string, any> {
    if (!error) return {};

    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
      ...(error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : {})
    };
  }

  function formatMeta(meta?: Record<string, any>): Record<string, any> {
    if (!meta) return {};

    const formatted: Record<string, any> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (key === 'error') {
        formatted[key] = formatError(value);
      } else if (value instanceof Error) {
        formatted[key] = formatError(value);
      } else if (value instanceof Buffer) {
        formatted[key] = `<Buffer: ${value.length} bytes>`;
      } else if (typeof value === 'function') {
        formatted[key] = '<Function>';
      } else if (typeof value === 'object' && value !== null) {
        formatted[key] = formatMeta(value);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }

  function log(level: string, message: string, meta?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      meta: formatMeta(meta)
    };

    // In development, pretty print logs
    if (process.env.NODE_ENV === 'development') {
      console[level === 'error' ? 'error' : 'log'](
        `[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.component}] ${entry.message}`,
        entry.meta && Object.keys(entry.meta).length > 0 ? '\n' + JSON.stringify(entry.meta, null, 2) : ''
      );
    } else {
      // In production, output JSON for log aggregation
      console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
    }
  }

  return {
    info(message: string, meta?: Record<string, any>) {
      log('info', message, meta);
    },
    
    warn(message: string, meta?: Record<string, any>) {
      log('warn', message, meta);
    },
    
    error(message: string, meta?: Record<string, any>) {
      log('error', message, meta);
    },
    
    debug(message: string, meta?: Record<string, any>) {
      if (process.env.DEBUG === 'true') {
        log('debug', message, meta);
      }
    }
  };
}