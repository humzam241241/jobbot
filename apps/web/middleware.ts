import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware to add cache control headers
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add no-cache headers to prevent caching issues
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

// Only run middleware on auth routes
export const config = {
  matcher: [
    '/api/auth/:path*',
    '/login'
  ],
};