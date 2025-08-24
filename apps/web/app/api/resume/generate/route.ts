import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getMockUser, createMockResumeKit, updateMockResumeKit } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { debugLogger } from '@/lib/utils/debug-logger';
import { generateContent } from '@/lib/pipeline/generateContent';
import { createAtsReport } from '@/lib/pipeline/atsReport';
import { extractProfile } from '@/lib/extractors/extractProfile';
import puppeteer from 'puppeteer';
import type { ResumeKit } from '@/lib/types/resumeKit';

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

// Create logs directory if it doesn't exist
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create artifacts directory if it doesn't exist
const ARTIFACTS_DIR = path.join(process.cwd(), 'public/kits');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

/**
 * Converts HTML to PDF using Puppeteer
 */
async function htmlToPdf(html: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true
    });
  } finally {
    await browser.close();
  }
}

export async function POST(request: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();
  const logs: any[] = [];
  
  function log(message: string, data?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data,
      requestId
    };
    logs.push(entry);
    debugLogger.debug(message, { component: 'API:resume/generate', data });
  }

  try {
    log('Request received', { requestId });
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log('Authentication failed', { session });
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }
    
    log('User authenticated', { userId: (session.user as any).id });

    // Parse form data
    const formData = await request.formData();
    const resume = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as string;
    const jobUrl = formData.get('jobUrl') as string;
    const provider = formData.get('provider') as string;
    const model = formData.get('model') as string;
    
    log('Form data parsed', { 
      hasResume: !!resume,
      resumeSize: resume?.size,
      resumeType: resume?.type,
      jobDescriptionLength: jobDescription?.length,
      hasJobUrl: !!jobUrl,
      provider,
      model
    });

    // Validate inputs
    if (!resume || !jobDescription) {
      log('Validation failed', { resume: !!resume, jobDescription: !!jobDescription });
      return NextResponse.json(
        { success: false, error: { message: 'Resume and job description are required' } },
        { status: 400 }
      );
    }

    // Check file type
    if (resume.type !== 'application/pdf') {
      log('Invalid file type', { type: resume.type });
      return NextResponse.json(
        { success: false, error: { message: 'Only PDF files are supported' } },
        { status: 400 }
      );
    }

    // Check usage credits
    let user: any;
    try {
      if (isDbEnabled) {
        log('Checking user credits in database');
        user = await (prisma as any)!.user.findUnique({
          where: { id: (session.user as any).id }
        });
      } else {
        log('Using mock user');
        user = getMockUser((session.user as any).id || 'mock-user');
      }
      
      if (!user || (typeof user.credits === 'number' && user.credits <= 0)) {
        log('Insufficient credits', { userId: (session.user as any).id, credits: user?.credits });
        return NextResponse.json(
          { success: false, error: { message: 'Insufficient credits' } },
          { status: 402 }
        );
      }
      
      log('User has credits', { credits: user.credits ?? 'mock' });
    } catch (error) {
      log('Error checking credits', { error: String(error) });
      return NextResponse.json(
        { success: false, error: { message: 'Error checking credits' } },
        { status: 500 }
      );
    }

    // Create resume kit
    let kit: any;
    try {
      const kitId = `kit_${Date.now()}`;
      const kitDir = path.join(ARTIFACTS_DIR, kitId);
      fs.mkdirSync(kitDir, { recursive: true });

      const kitData: Partial<ResumeKit> = {
        id: kitId,
        userId: (session.user as any).id,
        status: 'pending',
        originalResume: 'Processing...',
        jobDescription,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isDbEnabled) {
        log('Creating resume kit in database');
        kit = await (prisma as any)!.resumeKit.create({ data: kitData });
      } else {
        log('Creating mock resume kit');
        kit = createMockResumeKit(kitData);
      }
      
      log('Resume kit created', { kitId: kit.id });

      // Convert resume to buffer
      const resumeBuffer = Buffer.from(await resume.arrayBuffer());
      
      // Extract profile from resume
      log('Extracting profile');
      const profile: any = await extractProfile(resumeBuffer, resume.type);
      log('Profile extracted', { profile });
      
      // Generate content
      log('Generating content');
      const { resumeHtml, coverHtml } = await generateContent({
        resumeOriginalText: resumeBuffer.toString('utf-8'),
        jdText: jobDescription,
        jdUrl: jobUrl,
        modelHint: model,
        profile,
        kitId: kit.id
      });
      log('Content generated');

      // Generate ATS report
      log('Generating ATS report');
      const { url: atsUrl, score: atsScore, reportHtml } = await createAtsReport({
        resumeText: resumeBuffer.toString('utf-8'),
        jdText: jobDescription,
        profile,
        kitId: kit.id
      });
      log('ATS report generated', { atsScore });

      // Save artifacts
      const resumePath = path.join(kitDir, 'resume.pdf');
      const coverPath = path.join(kitDir, 'cover-letter.pdf');
      const atsPath = path.join(kitDir, 'ats.html');

      // Convert HTML to PDF
      log('Converting resume to PDF');
      await htmlToPdf(resumeHtml, resumePath);
      log('Converting cover letter to PDF');
      await htmlToPdf(coverHtml, coverPath);
      log('Saving ATS report');
      fs.writeFileSync(atsPath, reportHtml);

      // Verify files exist and have content
      const fileStats = await Promise.all([
        fs.promises.stat(resumePath),
        fs.promises.stat(coverPath),
        fs.promises.stat(atsPath)
      ]);

      const allFilesValid = fileStats.every(stat => stat.size > 0);
      if (!allFilesValid) {
        throw new Error('Generated files validation failed');
      }

      // Update kit with results
      const updateData: Partial<ResumeKit> = {
        status: 'completed',
        tailoredResume: `/kits/${kitId}/resume.pdf`,
        coverLetter: `/kits/${kitId}/cover-letter.pdf`,
        atsReport: `/kits/${kitId}/ats.html`,
        updatedAt: new Date()
      };

      if (isDbEnabled) {
        // Use transaction to update kit and decrement credits atomically
        await (prisma as any)!.$transaction([
          (prisma as any)!.resumeKit.update({
            where: { id: kit.id },
            data: updateData
          }),
          (prisma as any)!.user.update({
            where: { id: (session.user as any).id },
            data: {
              credits: {
                decrement: 1
              }
            } as any
          })
        ]);
        log('Database updated in transaction');
      } else {
        log('Updating mock resume kit');
        kit = updateMockResumeKit(kit.id, updateData);
      }

      // Return success
      return NextResponse.json({
        success: true,
        data: {
          id: kit.id,
          status: 'completed',
          atsScore,
          artifacts: {
            resume: updateData.tailoredResume,
            coverLetter: updateData.coverLetter,
            atsReport: updateData.atsReport
          }
        }
      });

    } catch (error) {
      const err = error as Error;
      log('Error during generation', { 
        error: err?.message || String(err),
        stack: err?.stack,
        name: err?.name
      });
      
      // Update kit status to failed
      const failureData: Partial<ResumeKit> = {
        status: 'failed',
        error: err.message,
        updatedAt: new Date()
      };

      if (isDbEnabled && kit) {
        await (prisma as any)!.resumeKit.update({
          where: { id: kit.id },
          data: failureData
        });
      } else if (kit) {
        updateMockResumeKit(kit.id, failureData);
      }
      
      // Save error logs
      const errorLogFileName = `resume-generate-error-${requestId}-${Date.now()}.json`;
      const errorLogPath = path.join(LOG_DIR, errorLogFileName);
      
      const errorLogData = {
        requestId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name
        },
        logs
      };
      
      fs.writeFileSync(errorLogPath, JSON.stringify(errorLogData, null, 2));

      return NextResponse.json(
        { success: false, error: { message: 'Generation failed', code: 'GENERATION_ERROR' } },
        { status: 500 }
      );
    }

  } catch (error: any) {
    log('Unexpected error', { 
      error: error.message, 
      stack: error.stack,
      name: error.name
    });
    
    // Save error logs
    const errorLogFileName = `resume-generate-error-${requestId}-${Date.now()}.json`;
    const errorLogPath = path.join(LOG_DIR, errorLogFileName);
    
    const errorLogData = {
      requestId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      logs
    };
    
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLogData, null, 2));
    
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}