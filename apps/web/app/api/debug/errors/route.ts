import { NextRequest, NextResponse } from 'next/server';
import { errorLogger } from '@/lib/errors/logger';

export async function GET(req: NextRequest) {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ errors: [] });
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')) || 10;

  return NextResponse.json({
    errors: errorLogger.getRecentErrors(limit),
    stats: errorLogger.getErrorStats()
  });
}
