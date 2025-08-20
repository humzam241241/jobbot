import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// This endpoint returns the last errors for debugging purposes
// It's protected and only available for admins

export async function GET(req: NextRequest) {
  try {
    // Check if the user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.email?.endsWith('@ontariotechu.net') || 
                    session?.user?.email === 'admin@example.com';
    
    if (!isAdmin) {
      // Allow local development access
      const host = req.headers.get('host') || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      
      if (!isLocalhost) {
        return NextResponse.json(
          { error: "Unauthorized. Admin access required." },
          { status: 403 }
        );
      }
    }
    
    // Get the last errors from the logger
    const errors = logger.getLastErrors();
    
    return NextResponse.json({
      count: errors.length,
      errors
    });
  } catch (error) {
    console.error("Error retrieving debug logs:", error);
    return NextResponse.json(
      { error: "Failed to retrieve debug logs" },
      { status: 500 }
    );
  }
}