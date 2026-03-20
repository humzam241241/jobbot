import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createKitDirectory } from '@/lib/pipeline';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function POST(
  req: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kitId = await createKitDirectory();
    const kitDir = path.join(process.cwd(), 'storage', 'kits', kitId);
    await mkdir(kitDir, { recursive: true });

    return NextResponse.json({ kitId });
  } catch (error) {
    console.error('Kit creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create kit' },
      { status: 500 }
    );
  }
}