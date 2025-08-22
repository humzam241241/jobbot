import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/jobbot',
  '/applications',
  '/library',
  '/settings',
  '/file-manager',
  '/scraper',
  '/tokens',
  '/admin',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/login',
  '/signup',
];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  
  // Get the token from the session
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Check if the user is authenticated
  const isAuthenticated = !!token;
  
  // Add CORS headers for /api/download routes
  if (pathname.startsWith('/api/download/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Add caching headers for /downloads routes
  if (pathname.startsWith('/downloads/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }
  
  // Handle authentication routing
  if (!isAuthenticated) {
    // If the user is not authenticated and trying to access a protected route,
    // redirect them to the landing page
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } else {
    // If the user is authenticated and trying to access an auth route,
    // redirect them to the dashboard
    if (authRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/download/:path*', 
    '/downloads/:path*',
    '/dashboard/:path*',
    '/jobbot/:path*',
    '/applications/:path*',
    '/library/:path*',
    '/settings/:path*',
    '/file-manager/:path*',
    '/scraper/:path*',
    '/tokens/:path*',
    '/admin/:path*',
    '/login/:path*',
    '/signup/:path*'
  ],
};