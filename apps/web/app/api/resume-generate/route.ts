import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

// Redirect to the canonical endpoint
export async function POST(req: NextRequest) {
  console.log("[DEBUG] Redirecting from /api/resume-generate to /api/resume/generate");
  
  try {
    // Clone the request to forward it
    const url = new URL('/api/resume/generate', req.url);
    console.log("[DEBUG] Forwarding to URL:", url.toString());
    
    // Instead of forwarding the request, handle it directly
    // This avoids the content-length mismatch error
    const handler = await import('../resume/generate/route');
    
    // Call the handler directly with the request
    console.log("[DEBUG] Calling handler directly");
    return handler.POST(req);
  } catch (error) {
    console.error("[DEBUG] Error redirecting request:", error);
    
    // If forwarding fails, return an error
    return NextResponse.json({
      ok: false,
      error: "Failed to forward request to canonical endpoint",
      message: "Please use /api/resume/generate directly.",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }, { 
      status: 500,
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }
}

// Simple GET handler for debugging
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "This endpoint is an alias for /api/resume/generate",
    redirected: true,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}
