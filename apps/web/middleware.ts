import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Always redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
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