import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Keep a small in-memory buffer of recent errors
const MAX_ERRORS = 50;
const recentErrors: any[] = [];

export function addError(error: any) {
  recentErrors.unshift({
    timestamp: new Date().toISOString(),
    ...error
  });
  
  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.pop();
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check if a specific traceId was requested
    const { searchParams } = new URL(req.url);
    const traceId = searchParams.get('traceId');
    
    if (traceId) {
      // Try to read the specific log file
      const debugDir = path.join(process.cwd(), 'debug');
      const logPath = path.join(debugDir, `${traceId}.log`);
      
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        const entries = lines.map(line => JSON.parse(line));
        
        return NextResponse.json({
          traceId,
          entries
        });
      } else {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }
    }
    
    // Return the in-memory error buffer
    return NextResponse.json({
      errors: recentErrors
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve logs', details: error.message },
      { status: 500 }
    );
  }
}