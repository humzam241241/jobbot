import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * API endpoint for centralized logging
 * Handles error logs and other log entries from the client
 */
export async function POST(request: NextRequest) {
  try {
    // Get the session to identify the user
    const session = await getServerSession(authOptions);
    
    // Parse the log entry from the request body
    const logEntry = await request.json();
    
    // Add server-side context
    const enhancedLogEntry = {
      ...logEntry,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      serverTimestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    };

    // In production, send to your logging service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external logging service
      // await sendToLoggingService(enhancedLogEntry);
      
      // For now, just log to console in production
      console.error('[CLIENT_LOG]', JSON.stringify(enhancedLogEntry));
    } else {
      // In development, log to console for debugging
      console.log('[DEV_LOG]', enhancedLogEntry);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to process log entry:', error);
    return NextResponse.json(
      { error: 'Failed to process log entry' },
      { status: 500 }
    );
  }
}

/**
 * Optional: GET endpoint to retrieve logs for debugging
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admins to view logs
    if (session?.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // In a real implementation, you'd fetch logs from your database or logging service
    return NextResponse.json({
      message: 'Logs endpoint - implement based on your logging infrastructure',
      suggestion: 'Connect to your logging service (Sentry, LogRocket, etc.) here'
    });
  } catch (error) {
    console.error('Failed to retrieve logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' },
      { status: 500 }
    );
  }
}
