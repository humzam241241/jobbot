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
  { params }: { params: { kitId: string } }
) {
  const { kitId } = params;
  
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
      const resumePath = path.join(publicDir, kit.tailoredResume?.replace(/^\//, '') || '');
      const coverLetterPath = path.join(publicDir, kit.coverLetter?.replace(/^\//, '') || '');
      const atsReportPath = path.join(publicDir, kit.atsReport?.replace(/^\//, '') || '');

      const filesExist = [resumePath, coverLetterPath, atsReportPath].every(filePath => {
        try {
          return fs.existsSync(filePath);
        } catch (error) {
          debugLogger.error('Error checking file existence', { 
            component: 'API:resume-kit/[kitId]', 
            filePath, 
            error 
          });
          return false;
        }
      });

      if (!filesExist) {
        debugLogger.warn('Files missing for completed kit', { 
          component: 'API:resume-kit/[kitId]', 
          kitId,
          resumePath,
          coverLetterPath,
          atsReportPath
        });
        // Update status to failed if files are missing
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