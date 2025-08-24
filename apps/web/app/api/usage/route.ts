import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getMockUser } from '@/lib/db';

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    let user: any;
    try {
      if (isDbEnabled) {
        user = await (prisma as any)!.user.findUnique({
          where: { id: (session.user as any).id }
        });
      } else {
        user = getMockUser((session.user as any).id || 'mock-user');
      }
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return NextResponse.json({ error: 'Error fetching user data' }, { status: 500 });
    }

    // Calculate usage
    const credits = user.credits || 30;
    const maxCredits = 30; // Default max credits
    const used = maxCredits - credits;

    // Return usage data
    return NextResponse.json({
      count: used,
      limit: maxCredits,
      remaining: credits,
      provider: process.env.DEFAULT_AI_PROVIDER || 'Google'
    });
  } catch (error) {
    console.error('Error in usage API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}