import { signOut } from 'next-auth/react';
import { createLogger } from '../logger';

const logger = createLogger('auth-utils');

export async function forceLogout() {
  try {
    // Clear any stored tokens
    await signOut({ redirect: false });
    
    // Clear any local storage items
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    logger.info('Force logout completed');
  } catch (error) {
    logger.error('Force logout failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export function isTokenExpired(token: any): boolean {
  if (!token?.iat) return true;
  
  const tokenAge = (Date.now() / 1000) - token.iat;
  return tokenAge >= 15 * 60; // 15 minutes
}
