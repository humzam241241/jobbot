/**
 * Debug Logger Utility
 * 
 * This utility provides structured logging capabilities for both client and server-side debugging.
 * It includes support for different log levels, timestamps, and structured data output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  timestamp?: boolean;
  component?: string;
  data?: Record<string, any>;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{
    level: LogLevel;
    message: string;
    timestamp: Date;
    component?: string;
    data?: Record<string, any>;
  }> = [];
  
  private isDebugMode: boolean = false;

  private constructor() {
    // Initialize with environment settings
    this.isDebugMode = 
      typeof window !== 'undefined' 
        ? localStorage.getItem('DEBUG_MODE') === 'true'
        : process.env.DEBUG_MODE === 'true';
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  public enableDebugMode(): void {
    this.isDebugMode = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_MODE', 'true');
    }
  }

  public disableDebugMode(): void {
    this.isDebugMode = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('DEBUG_MODE');
    }
  }

  public log(level: LogLevel, message: string, options: LogOptions = {}): void {
    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      component: options.component,
      data: options.data
    };
    
    this.logs.push(logEntry);
    
    if (this.isDebugMode) {
      const formattedMessage = this.formatLogMessage(logEntry);
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, options.data || '');
          break;
        case 'info':
          console.info(formattedMessage, options.data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, options.data || '');
          break;
        case 'error':
          console.error(formattedMessage, options.data || '');
          break;
      }
    }
  }

  public debug(message: string, options: LogOptions = {}): void {
    this.log('debug', message, options);
  }

  public info(message: string, options: LogOptions = {}): void {
    this.log('info', message, options);
  }

  public warn(message: string, options: LogOptions = {}): void {
    this.log('warn', message, options);
  }

  public error(message: string, options: LogOptions = {}): void {
    this.log('error', message, options);
  }

  public getLogs(): Array<{
    level: LogLevel;
    message: string;
    timestamp: Date;
    component?: string;
    data?: Record<string, any>;
  }> {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      exportedAt: new Date(),
      environment: typeof window !== 'undefined' ? 'client' : 'server',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    }, null, 2);
  }

  private formatLogMessage(logEntry: {
    level: LogLevel;
    message: string;
    timestamp: Date;
    component?: string;
  }): string {
    const timestamp = logEntry.timestamp.toISOString();
    const component = logEntry.component ? `[${logEntry.component}]` : '';
    return `[${timestamp}][${logEntry.level.toUpperCase()}]${component} ${logEntry.message}`;
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Export convenience functions
export const debugLog = (message: string, options?: LogOptions) => 
  debugLogger.debug(message, options);

export const infoLog = (message: string, options?: LogOptions) => 
  debugLogger.info(message, options);

export const warnLog = (message: string, options?: LogOptions) => 
  debugLogger.warn(message, options);

export const errorLog = (message: string, options?: LogOptions) => 
  debugLogger.error(message, options);

export default debugLogger;
