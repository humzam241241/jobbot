import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { processResume } from '@/lib/resumeProcessor';
import path from 'path';
import fs from 'fs';

const logger = createLogger('rewrite-resume-api');

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;

    if (!file || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save uploaded file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(tempDir, file.name);
    fs.writeFileSync(filePath, buffer);

    logger.info('Processing resume', {
      fileName: file.name,
      fileSize: buffer.length,
    });

    // Process the resume
    const { docxPath, pdfPath } = await processResume(filePath, jobDescription);

    // Move files to public directory for download
    const publicDir = path.join(process.cwd(), 'public', 'resumes');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const timestamp = Date.now();
    const docxPublicPath = path.join(publicDir, `resume_${timestamp}.docx`);
    const pdfPublicPath = path.join(publicDir, `resume_${timestamp}.pdf`);

    fs.copyFileSync(docxPath, docxPublicPath);
    fs.copyFileSync(pdfPath, pdfPublicPath);

    // Clean up temp files
    fs.unlinkSync(filePath);
    fs.unlinkSync(docxPath);
    fs.unlinkSync(pdfPath);

    // Return download URLs
    return NextResponse.json({
      docxUrl: `/resumes/resume_${timestamp}.docx`,
      pdfUrl: `/resumes/resume_${timestamp}.pdf`,
    });
  } catch (error: any) {
    logger.error('Resume processing failed', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Resume processing failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
