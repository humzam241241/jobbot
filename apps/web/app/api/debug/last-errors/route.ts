import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory ring buffer for last 20 errors
// Note: This will reset on server restart
const MAX_ERRORS = 20;
const errorBuffer: Array<{
  timestamp: string;
  code: string;
  message: string;
  details?: any;
  path?: string;
  telemetryId?: string;
}> = [];

/**
 * Add an error to the buffer
 * This is exported so it can be used from other API routes
 */
export function addError(error: {
  code: string;
  message: string;
  details?: any;
  path?: string;
  telemetryId?: string;
}) {
  // Add timestamp
  const errorWithTimestamp = {
    ...error,
    timestamp: new Date().toISOString(),
  };

  // Add to buffer (maintaining max size)
  errorBuffer.unshift(errorWithTimestamp);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.pop();
  }
}

/**
 * GET handler for retrieving errors
 * Only available in development mode
 */
export async function GET(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    errors: errorBuffer,
    count: errorBuffer.length,
    maxCapacity: MAX_ERRORS,
  });
}

/**
 * POST handler for adding errors
 * Only available in development mode
 */
export async function POST(req: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.code || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: code, message" },
        { status: 400 }
      );
    }

    // Add error to buffer
    addError({
      code: body.code,
      message: body.message,
      details: body.details,
      path: body.path || req.nextUrl.pathname,
      telemetryId: body.telemetryId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
