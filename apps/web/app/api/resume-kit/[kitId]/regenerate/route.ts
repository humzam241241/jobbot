import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getMockResumeKit, updateMockResumeKit } from '@/lib/db';
import { debugLogger } from '@/lib/utils/debug-logger';

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

export async function POST(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  const { kitId } = params;
  
  try {
    debugLogger.debug('Regenerating resume kit', { component: 'API:resume-kit/[kitId]/regenerate', kitId });

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      debugLogger.debug('Authentication failed', { component: 'API:resume-kit/[kitId]/regenerate', session });
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
      debugLogger.debug('Fetching resume kit from database', { component: 'API:resume-kit/[kitId]/regenerate', kitId });
      kit = await (prisma as any)!.resumeKit.findUnique({
        where: { id: kitId }
      });
    } else {
      debugLogger.debug('Fetching mock resume kit', { component: 'API:resume-kit/[kitId]/regenerate', kitId });
      kit = getMockResumeKit(kitId);
    }

    if (!kit) {
      debugLogger.debug('Resume kit not found', { component: 'API:resume-kit/[kitId]/regenerate', kitId });
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
        component: 'API:resume-kit/[kitId]/regenerate', 
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

    // Check user credits
    let user;
    if (isDbEnabled) {
      debugLogger.debug('Checking user credits in database', { component: 'API:resume-kit/[kitId]/regenerate' });
      user = await (prisma as any)!.user.findUnique({
        where: { id: (session.user as any).id }
      });
    } else {
      user = { credits: 30 }; // Mock user with credits
    }

    if (!user || user.credits <= 0) {
      debugLogger.debug('Insufficient credits', { 
        component: 'API:resume-kit/[kitId]/regenerate',
        userId: (session.user as any).id, 
        credits: user?.credits 
      });
      return NextResponse.json(
        { success: false, error: { message: 'Insufficient credits' } },
        { 
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update kit status to pending for regeneration
    if (isDbEnabled) {
      await (prisma as any)!.resumeKit.update({
        where: { id: kitId },
        data: { 
          status: 'pending',
          error: null
        }
      });
    } else {
      updateMockResumeKit(kitId, { 
        status: 'pending',
        error: undefined
      });
    }

    // In a real implementation, we would trigger the generation process here
    // For now, just return success
    return NextResponse.json(
      {
        success: true,
        data: {
          id: kitId,
          status: 'pending'
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    debugLogger.error('Error regenerating resume kit', { 
      component: 'API:resume-kit/[kitId]/regenerate', 
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

// Set CORS headers
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};