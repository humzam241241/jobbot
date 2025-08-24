import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getMockResumeKit } from '@/lib/db';
import { debugLogger } from '@/lib/utils/debug-logger';
import fs from 'fs';
import path from 'path';

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

export async function GET(
  request: NextRequest,
  ctx?: { params?: { kitId: string } }
) {
  // Be defensive: Next should pass params, but some wrappers may omit it
  let kitId = ctx?.params?.kitId;
  if (!kitId) {
    try {
      const path = request.nextUrl.pathname; // /api/resume-kit/{kitId}
      const parts = path.split('/').filter(Boolean);
      const idx = parts.findIndex(p => p === 'resume-kit');
      if (idx !== -1 && parts[idx + 1]) kitId = parts[idx + 1];
    } catch {}
  }
  if (!kitId) {
    return NextResponse.json(
      { success: false, error: { message: 'Missing kitId' } },
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    debugLogger.debug('Fetching resume kit', { component: 'API:resume-kit/[kitId]', kitId });

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      debugLogger.debug('Authentication failed', { component: 'API:resume-kit/[kitId]', session });
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get resume kit
    let kit;
    if (isDbEnabled) {
      debugLogger.debug('Fetching resume kit from database', { component: 'API:resume-kit/[kitId]', kitId });
      kit = await (prisma as any)!.resumeKit.findUnique({
        where: { id: kitId }
      });
    } else {
      debugLogger.debug('Fetching mock resume kit', { component: 'API:resume-kit/[kitId]', kitId });
      kit = getMockResumeKit(kitId);
    }

    if (!kit) {
      debugLogger.debug('Resume kit not found', { component: 'API:resume-kit/[kitId]', kitId });
      return NextResponse.json(
        { success: false, error: { message: 'Resume kit not found' } },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user has access to this kit
    if (kit.userId !== (session.user as any).id) {
      debugLogger.debug('User does not have access to this kit', { 
        component: 'API:resume-kit/[kitId]', 
        kitId, 
        userId: (session.user as any).id, 
        kitUserId: kit.userId 
      });
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

          // Check if files exist for completed kits
      if (kit.status === 'completed') {
        const publicDir = path.join(process.cwd(), 'public');
        
        // Check which files exist
        const resumePath = kit.tailoredResume ? path.join(publicDir, kit.tailoredResume.replace(/^\//, '')) : null;
        const coverLetterPath = kit.coverLetter ? path.join(publicDir, kit.coverLetter.replace(/^\//, '')) : null;
        const atsReportPath = kit.atsReport ? path.join(publicDir, kit.atsReport.replace(/^\//, '')) : null;
        
        // Track which files exist
        const hasResume = resumePath ? fs.existsSync(resumePath) : false;
        const hasCoverLetter = coverLetterPath ? fs.existsSync(coverLetterPath) : false;
        const hasAtsReport = atsReportPath ? fs.existsSync(atsReportPath) : false;
        
        // Log file existence
        debugLogger.info('Checking files for kit', { 
          component: 'API:resume-kit/[kitId]', 
          kitId,
          hasResume,
          hasCoverLetter,
          hasAtsReport,
          resumePath,
          coverLetterPath,
          atsReportPath
        });
        
        // Add file existence info to kit
        kit.hasResume = hasResume;
        kit.hasCoverLetter = hasCoverLetter;
        kit.hasAtsReport = hasAtsReport;
        
        // Only mark as failed if the resume is missing (the most important file)
        if (!hasResume) {
          debugLogger.warn('Resume file missing for completed kit', { 
            component: 'API:resume-kit/[kitId]', 
            kitId,
            resumePath
          });
          
          // Update status to failed if resume is missing
          if (isDbEnabled) {
            await (prisma as any)!.resumeKit.update({
              where: { id: kitId },
              data: { 
                status: 'failed',
                error: 'Generated files are missing'
              }
            });
          }
          kit.status = 'failed';
          kit.error = 'Generated files are missing';
        }
      }

    // Return kit data
    return NextResponse.json(
      { success: true, data: kit },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    debugLogger.error('Error fetching resume kit', { 
      component: 'API:resume-kit/[kitId]', 
      kitId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Support HEAD requests
export async function HEAD(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  return new NextResponse(null, { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Set CORS headers
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};