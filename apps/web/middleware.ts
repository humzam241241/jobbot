import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add CORS headers for /api/download routes
  if (request.nextUrl.pathname.startsWith('/api/download/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Add caching headers for /downloads routes
  if (request.nextUrl.pathname.startsWith('/downloads/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }

  return response;
}

export const config = {
  matcher: ['/api/download/:path*', '/downloads/:path*'],
};