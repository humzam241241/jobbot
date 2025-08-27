/**
 * Comprehensive logging utility for error tracking and debugging
 */

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: any;
  timestamp: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  stack?: string;
}

export interface GoogleDriveError extends Error {
  code?: string;
  details?: any;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    details?: any,
    component?: string
  ): LogEntry {
    return {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      component,
      stack: new Error().stack,
    };
  }

  private formatConsoleOutput(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp}`;
    const componentInfo = entry.component ? ` [${entry.component}]` : '';
    
    const style = {
      info: 'color: #0ea5e9',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444',
      debug: 'color: #6b7280'
    }[entry.level];

    if (this.isDev) {
      console.group(`%c${prefix}${componentInfo}: ${entry.message}`, style);
      if (entry.details) {
        console.log('Details:', entry.details);
      }
      if (entry.stack && entry.level === 'error') {
        console.log('Stack:', entry.stack);
      }
      console.groupEnd();
    }
  }

  private async saveLogEntry(entry: LogEntry): Promise<void> {
    try {
      // In development, we'll save to localStorage
      // In production, you'd send to your logging service
      if (typeof window !== 'undefined' && this.isDev) {
        const logs = this.getStoredLogs();
        logs.push(entry);
        
        // Keep only last 100 logs in localStorage
        const recentLogs = logs.slice(-100);
        localStorage.setItem('app_logs', JSON.stringify(recentLogs));
      }

      // In production, send to logging service (e.g., Sentry, LogRocket, etc.)
      if (!this.isDev) {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {
          // Silently fail - don't let logging break the app
        });
      }
    } catch (error) {
      // Don't let logging errors break the app
      console.error('Failed to save log entry:', error);
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem('app_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  info(message: string, details?: any, component?: string): void {
    const entry = this.createLogEntry('info', message, details, component);
    this.formatConsoleOutput(entry);
    this.saveLogEntry(entry);
  }

  warn(message: string, details?: any, component?: string): void {
    const entry = this.createLogEntry('warn', message, details, component);
    this.formatConsoleOutput(entry);
    this.saveLogEntry(entry);
  }

  error(message: string, error?: any, component?: string): void {
    const entry = this.createLogEntry('error', message, error, component);
    this.formatConsoleOutput(entry);
    this.saveLogEntry(entry);
  }

  debug(message: string, details?: any, component?: string): void {
    const entry = this.createLogEntry('debug', message, details, component);
    this.formatConsoleOutput(entry);
    this.saveLogEntry(entry);
  }

  // Specialized method for Google Drive errors
  googleDriveError(operation: string, error: GoogleDriveError, details?: any): void {
    this.error(
      `Google Drive ${operation} failed`,
      {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        operationDetails: details,
        stack: error.stack,
      },
      'GoogleDrive'
    );
  }

  // Method to export logs for debugging
  exportLogs(): LogEntry[] {
    return this.getStoredLogs();
  }

  // Method to clear logs
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_logs');
    }
  }
}

export const logger = new Logger();

// Export convenience functions
export const logInfo = (message: string, details?: any, component?: string) => 
  logger.info(message, details, component);

export const logWarn = (message: string, details?: any, component?: string) => 
  logger.warn(message, details, component);

export const logError = (message: string, error?: any, component?: string) => 
  logger.error(message, error, component);

export const logDebug = (message: string, details?: any, component?: string) => 
  logger.debug(message, details, component);

export const logGoogleDriveError = (operation: string, error: GoogleDriveError, details?: any) => 
  logger.googleDriveError(operation, error, details);

// Factory to create a component-scoped logger compatible with existing imports
export function createLogger(component: string) {
  return {
    info(message: string, details?: any) {
      logger.info(message, details, component);
    },
    warn(message: string, details?: any) {
      logger.warn(message, details, component);
    },
    error(message: string, error?: any) {
      logger.error(message, error, component);
    },
    debug(message: string, details?: any) {
      logger.debug(message, details, component);
    },
  } as const;
}