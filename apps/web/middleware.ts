import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth?.token;
    const isAuth = !!token;

    // If no token on protected routes, send to login with return URL
    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
    }

    // Token exists, allow through
    return NextResponse.next();
  },
  {
    // Ensure middleware uses the same secret to decode JWTs
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => {
        // Let the middleware function handle the logic
        return true; // do not block here; logic above handles redirects
      },
    },
  }
);

export const config = {
  // Protect only app pages that require auth to avoid accidental loops
  matcher: [
    '/dashboard/:path*',
    '/jobbot/:path*',
    '/applications/:path*',
    '/library/:path*',
    '/scraper/:path*',
    '/settings/:path*',
  ],
};