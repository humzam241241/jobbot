import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { ZodError } from 'zod';

const logger = createLogger('api-error');

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export function sanitizeError(error: unknown): ApiError {
  if (error instanceof ApiException) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.errors
    };
  }

  if (error instanceof Error) {
    // Strip sensitive info from error details
    const sanitizedError = {
      code: 'INTERNAL_ERROR',
      message: error.message
    };

    // Log the full error internally
    logger.error('Internal error', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });

    return sanitizedError;
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error)
  };
}

export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers?: HeadersInit
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { ok: status < 400, data },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
        ...headers
      }
    }
  );
}

export function errorResponse(
  error: unknown,
  status: number = 500
): NextResponse<ApiResponse> {
  const sanitizedError = sanitizeError(error);
  return NextResponse.json(
    {
      ok: false,
      error: sanitizedError
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}

export function withErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error('API error caught by handler', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return errorResponse(error);
    }
  };
}
