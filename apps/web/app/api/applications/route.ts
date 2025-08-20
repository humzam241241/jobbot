import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobTitle, companyName, jobUrl } = body;

    if (!jobTitle || !companyName) {
      return NextResponse.json({ ok: false, error: 'Job title and company name are required' }, { status: 400 });
    }

    const newApplication = await prisma.jobApplication.create({
      data: {
        jobTitle,
        company: companyName,
        url: jobUrl,
        status: 'APPLIED', // Default status
        // You may need to associate this with a user ID
        // userId: 'some-user-id', 
      },
    });

    return NextResponse.json({ ok: true, application: newApplication });
  } catch (error: any) {
    console.error('Failed to create application:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create application', details: error.message }, { status: 500 });
  }
}
