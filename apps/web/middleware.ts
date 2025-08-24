import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Always redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Handle login page - check if user is already authenticated
  if (pathname === '/login') {
    // Get the session token from the cookie
    const sessionToken = req.cookies.get('next-auth.session-token')?.value || 
                        req.cookies.get('__Secure-next-auth.session-token')?.value;
    
    // If user has a session token, redirect to dashboard
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/jobbot', '/results', '/applications', '/library', '/settings'];
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const authMiddleware = await withAuth({
      pages: {
        signIn: '/login',
      },
      callbacks: {
        authorized: ({ token }) => !!token,
      },
    });
    
    // @ts-ignore - withAuth returns a function
    return authMiddleware(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/jobbot/:path*',
    '/results/:path*',
    '/applications/:path*',
    '/library/:path*',
    '/settings/:path*',
    '/api/resume/:path*',
    '/api/usage/:path*',
    '/api/resume-kit/:path*',
  ],
};