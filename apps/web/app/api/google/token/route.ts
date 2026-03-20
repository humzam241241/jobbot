import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken || null;
  return NextResponse.json({ accessToken });
}


