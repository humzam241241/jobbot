import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Simple GET handler for debugging
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "This endpoint is deprecated. Please use /api/resume/generate instead.",
    redirected: true,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

// Direct handler - import the actual route handler
export async function POST(req: NextRequest) {
  console.log("[DEBUG] Handling /api/generate directly");
  
  try {
    // Import the handler from the canonical endpoint
    const handler = await import('../resume/generate/route');
    
    // Call the handler directly with the request
    console.log("[DEBUG] Calling handler directly from /api/generate");
    return handler.POST(req);
  } catch (error) {
    console.error("[DEBUG] Error handling request:", error);
    
    // If handling fails, return an error
    return NextResponse.json({
      ok: false,
      error: "Failed to process request",
      message: "An error occurred while processing your request.",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { 
      status: 500,
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }
}