import fs from 'fs';
import path from 'path';
import { ApiError } from './types';

class ErrorLogger {
  private logDir: string;
  private logFile: string;
  private debugLogFile: string;

  constructor() {
    // Create logs directory in project root
    this.logDir = path.join(process.cwd(), 'logs');
    fs.mkdirSync(this.logDir, { recursive: true });

    // Main error log and debug log paths
    this.logFile = path.join(this.logDir, 'error.log');
    this.debugLogFile = path.join(this.logDir, 'debug.log');
  }

  private formatError(error: ApiError): string {
    const timestamp = new Date().toISOString();
    const divider = '-'.repeat(80);
    
    let logEntry = [
      divider,
      `Timestamp: ${timestamp}`,
      `Request ID: ${error.requestId}`,
      `Error Code: ${error.code}`,
      `Message: ${error.message}`,
      ''
    ];

    if (error.details?.provider) {
      logEntry.push(`Provider: ${error.details.provider}`);
    }
    if (error.details?.model) {
      logEntry.push(`Model: ${error.details.model}`);
    }

    // Log provider attempts
    if (error.details?.attempts?.length) {
      logEntry.push('\nProvider Attempts:');
      error.details.attempts.forEach((attempt, i) => {
        logEntry.push(`${i + 1}. ${attempt.provider}: ${attempt.error} (${attempt.status || 'unknown status'})`);
      });
    }

    // Log validation errors
    if (error.details?.validation?.length) {
      logEntry.push('\nValidation Errors:');
      error.details.validation.forEach((v) => {
        logEntry.push(`- ${v.field}: ${v.message}`);
      });
    }

    // Log environment info
    if (error.details?.debug) {
      logEntry.push('\nEnvironment:');
      logEntry.push(`- Node: ${error.details.debug.nodeVersion}`);
      logEntry.push(`- DB Enabled: ${error.details.debug.dbEnabled}`);
      logEntry.push(`- Environment: ${error.details.debug.env}`);
    }

    // Log raw error details
    if (error.details?.raw) {
      logEntry.push('\nRaw Error:');
      logEntry.push(typeof error.details.raw === 'string' 
        ? error.details.raw 
        : JSON.stringify(error.details.raw, null, 2)
      );
    }

    // Log stack trace in debug log
    if (error.details?.debug?.stack) {
      this.appendDebugLog([
        divider,
        `Request ID: ${error.requestId}`,
        'Stack Trace:',
        error.details.debug.stack,
        ''
      ].join('\n'));
    }

    return logEntry.join('\n') + '\n';
  }

  private appendDebugLog(content: string) {
    try {
      fs.appendFileSync(this.debugLogFile, content);
    } catch (err) {
      console.error('Failed to write debug log:', err);
    }
  }

  public log(error: ApiError) {
    try {
      // Format and write error log
      const formattedError = this.formatError(error);
      fs.appendFileSync(this.logFile, formattedError);

      // Write full error object to debug log for complete context
      this.appendDebugLog(
        `${'-'.repeat(80)}\n` +
        `Request ID: ${error.requestId}\n` +
        'Full Error Object:\n' +
        JSON.stringify(error, null, 2) + '\n\n'
      );

      return true;
    } catch (err) {
      console.error('Failed to write error log:', err);
      return false;
    }
  }

  public getRecentErrors(limit = 10): string[] {
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      return content.split('-'.repeat(80))
        .filter(Boolean)
        .map(entry => entry.trim())
        .slice(-limit);
    } catch {
      return [];
    }
  }

  public getErrorStats(): { 
    total: number; 
    byCode: Record<string, number>;
    byProvider: Record<string, number>;
  } {
    try {
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const errors = content.split('-'.repeat(80)).filter(Boolean);

      const stats = {
        total: errors.length,
        byCode: {} as Record<string, number>,
        byProvider: {} as Record<string, number>
      };

      errors.forEach(error => {
        // Extract error code
        const codeMatch = error.match(/Error Code: (\w+)/);
        if (codeMatch) {
          const code = codeMatch[1];
          stats.byCode[code] = (stats.byCode[code] || 0) + 1;
        }

        // Extract provider
        const providerMatch = error.match(/Provider: (\w+)/);
        if (providerMatch) {
          const provider = providerMatch[1];
          stats.byProvider[provider] = (stats.byProvider[provider] || 0) + 1;
        }
      });

      return stats;
    } catch {
      return { total: 0, byCode: {}, byProvider: {} };
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();
