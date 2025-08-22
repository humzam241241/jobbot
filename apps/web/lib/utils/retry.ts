import { createLogger } from '@/lib/logger';

const logger = createLogger('retry');

/**
 * Retries a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      
      // If we've reached max retries, throw the error
      if (retries >= maxRetries) {
        logger.error('Max retries reached', { 
          error: error.message,
          retries,
          maxRetries
        });
        throw error;
      }
      
      // Calculate next delay with exponential backoff
      delay = delay * 2;
      
      logger.warn('Retrying after error', { 
        error: error.message,
        retry: retries,
        delay
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
