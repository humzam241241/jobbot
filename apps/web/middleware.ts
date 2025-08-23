import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Force revalidation of auth state
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  // Protected routes that require authentication
  matcher: [
    '/dashboard/:path*',
    '/jobbot/:path*',
    '/applications/:path*',
    '/settings/:path*',
    '/library/:path*',
    '/file-manager/:path*',
    '/scraper/:path*',
    '/api/resume/:path*',
    '/api/applications/:path*',
    '/api/library/:path*',
  ],
};