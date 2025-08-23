import { NextRequest, NextResponse } from 'next/server';
import { createDevLogger } from '@/lib/utils/devLogger';
import { sanitizeForJson } from '@/lib/utils/safeJson';

const logger = createDevLogger('api-error-handler');

/**
 * Wraps an API route handler with error handling
 * @param handler The API route handler function
 * @returns A wrapped handler that catches and handles errors
 */
export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      logger.error('Unhandled API error', {
        url: req.nextUrl.pathname,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Sanitize error details for JSON serialization
      const sanitizedError = sanitizeForJson(error);
      
      // Always return a JSON response, even for errors
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: sanitizedError.code || 'INTERNAL_SERVER_ERROR',
            message: sanitizedError.message || 'An unexpected error occurred',
            details: sanitizedError
          }
        },
        {
          status: sanitizedError.status || 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          }
        }
      );
    }
  };
}

/**
 * Creates a JSON response with proper headers
 * @param data The data to send
 * @param status The HTTP status code
 * @returns A NextResponse with JSON content type
 */
export function jsonResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0'
    }
  });
}
