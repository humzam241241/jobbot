import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createDevLogger } from "./devLogger";

const logger = createDevLogger("api:helpers");

/**
 * Helper function to create a bad request response
 * @param message Error message to display to the user
 * @param details Additional details for debugging (not shown to users in production)
 * @returns NextResponse with 400 status and JSON body
 */
export function badRequest(message: string, details?: Record<string, any>) {
  const errorId = uuidv4().slice(0, 8);
  
  // Log the error with a compact line
  const provider = details?.provider || "unknown";
  const extraction = details?.extracted ? "extracted" : "direct";
  logger.error(`[${errorId}] Bad request (${provider}/${extraction}): ${message}`);
  
  if (details && Object.keys(details).length > 0) {
    logger.debug(`[${errorId}] Details:`, details);
  }
  
  return NextResponse.json(
    {
      error: "BAD_REQUEST",
      message,
      errorId,
      details: process.env.NODE_ENV === "development" ? details : undefined,
    },
    { status: 400 }
  );
}

/**
 * Helper function to create a server error response
 * @param message Error message to display to the user
 * @param error Error object or details
 * @returns NextResponse with 500 status and JSON body
 */
export function serverError(message: string, error?: unknown) {
  const errorId = uuidv4().slice(0, 8);
  
  // Log the error
  logger.error(`[${errorId}] Server error: ${message}`);
  
  if (error) {
    if (error instanceof Error) {
      logger.error(`[${errorId}] ${error.name}: ${error.message}`);
      logger.debug(`[${errorId}] Stack: ${error.stack}`);
    } else {
      logger.error(`[${errorId}] Unknown error:`, error);
    }
  }
  
  return NextResponse.json(
    {
      error: "SERVER_ERROR",
      message,
      errorId,
      details: process.env.NODE_ENV === "development" ? error : undefined,
    },
    { status: 500 }
  );
}
