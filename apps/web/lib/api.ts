/**
 * Single-port API helper - all API calls are relative to the same origin
 */
export async function api(path: string, init: RequestInit = {}) {
  const headers: any = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  const res = await fetch(path, { ...init, headers });
  return res;
}

export function getJwt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwt');
}

export function requireAuth() {
  if (typeof window === 'undefined') return;
  const jwt = getJwt();
  if (!jwt) window.location.href = '/login';
}

