import { NextResponse } from 'next/server';

export async function GET() {
  const payload = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? 'set' : 'missing',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'missing',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'missing',
    SKIP_DB: process.env.SKIP_DB || '0',
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
    cookieSecure: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
  } as const;
  return NextResponse.json(payload);
}


