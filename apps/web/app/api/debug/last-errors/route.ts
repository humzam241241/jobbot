import { NextRequest, NextResponse } from 'next/server';
import { createDevLogger } from '@/lib/utils/devLogger';

const logger = createDevLogger('debug:last-errors');

// Ring buffer of last 10 errors
const errorBuffer: Array<{
  timestamp: number;
  id: string;
  error: string;
  details?: any;
}> = [];

const MAX_ERRORS = 10;

export function recordError(id: string, error: any) {
  const errorEntry = {
    timestamp: Date.now(),
    id,
    error: error?.message || String(error),
    details: {
      code: error?.code,
      provider: error?.provider,
      model: error?.model,
      stage: error?.stage,
    },
  };

  // Add to ring buffer
  errorBuffer.unshift(errorEntry);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.pop();
  }

  logger.error(`Error recorded [${id}]`, error);
}

export async function GET(req: NextRequest) {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ errors: [] });
  }

  return NextResponse.json({
    errors: errorBuffer.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp).toISOString(),
    })),
  });
}