import { logger } from '@/lib/logging/logger';

export async function withRetries<T>(fn: () => Promise<T>, {
  retries = 3,
  baseMs = 750,
  jitter = true
} = {}): Promise<T> {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { 
      return await fn(); 
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 429 && i < retries) {
        const delay = baseMs * Math.pow(2, i) + (jitter ? Math.floor(Math.random() * 250) : 0);
        logger.warn(`Rate limited, retrying in ${delay}ms (attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr!;
}
