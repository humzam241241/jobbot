// apps/web/app/api/resume/generate/route.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { tailorResume } from '@/lib/generators/tailorResume';
import { tailorCoverLetter } from '@/lib/generators/tailorCoverLetter';
import { v4 as uuidv4 } from 'uuid';
import { createDevLogger } from "@/lib/utils/devLogger";
import { incrementUsage, getUserUsage, hasReachedLimit } from "@/lib/usage/counter";

const logger = createDevLogger("api:resume:generate");

export const dynamic = "force-dynamic";

/**
 * API route for generating a resume kit (resume, cover letter)
 * Accepts JSON with masterResume, applicantProfile, and jobDescription
 */
export async function POST(req: NextRequest) {
  const traceId = uuidv4();
  logger.info(`Starting resume generation [${traceId}]`);
  
  // Check if the user has reached their usage limit
  if (hasReachedLimit()) {
    logger.warn(`User has reached usage limit [${traceId}]`);
    return NextResponse.json({ 
      error: 'USAGE_LIMIT_REACHED', 
      message: 'You have reached your usage limit. Please try again later.',
      usage: getUserUsage(),
      traceId
    }, { status: 429 });
  }
  
  try {
    const { requested, masterResume, applicantProfile, jobDescription } = await req.json();
    
    if (!masterResume) {
      return NextResponse.json({ 
        error: 'MISSING_RESUME', 
        message: 'Master resume is required',
        traceId
      }, { status: 400 });
    }
    
    if (!jobDescription) {
      return NextResponse.json({ 
        error: 'MISSING_JD', 
        message: 'Job description is required',
        traceId
      }, { status: 400 });
    }

    // 1) Tailor resume (format-preserving)
    let tr;
    try {
      logger.info(`Tailoring resume [${traceId}]`);
      tr = await tailorResume({ requested, masterResume, jobDescription });
      logger.info(`Resume tailoring successful using ${tr.provider}/${tr.model} [${traceId}]`);
    } catch (e: any) {
      logger.error(`Resume tailoring failed [${traceId}]`, e);
      return NextResponse.json({ 
        error: 'TAILORING_FAILED', 
        stage: 'resume', 
        details: e?.code || e?.message, 
        preview: e?.preview,
        traceId
      }, { status: 422 });
    }

    // 2) Tailor cover letter (industry-agnostic, references resume + tailored)
    let cl;
    try {
      logger.info(`Generating cover letter [${traceId}]`);
      cl = await tailorCoverLetter({ 
        requested, 
        applicantProfile, 
        tailoredResume: tr.result, 
        jobDescription 
      });
      logger.info(`Cover letter generation successful using ${cl.provider}/${cl.model} [${traceId}]`);
    } catch (e: any) {
      logger.error(`Cover letter generation failed [${traceId}]`, e);
      return NextResponse.json({ 
        error: 'COVER_LETTER_FAILED', 
        stage: 'cover-letter', 
        details: e?.code || e?.message, 
        preview: e?.preview,
        traceId
      }, { status: 422 });
    }

    // 3) Generate artifacts
    const outDir = path.join(process.cwd(), 'apps', 'web', 'public', 'resumes');
    await fs.mkdir(outDir, { recursive: true });
    logger.info(`Ensuring output directory exists: ${outDir} [${traceId}]`);

    const timestamp = Date.now();
    const resumePdfPath = path.join(outDir, `resume_${timestamp}_${traceId}.pdf`);
    const clPdfPath = path.join(outDir, `cover_letter_${timestamp}_${traceId}.pdf`);

    try {
      // Placeholder for PDF generation - replace with your actual PDF generation code
      // Example using atomic writes:
      
      // Generate resume PDF
      logger.info(`Generating resume PDF [${traceId}]`);
      const resumePdfTempPath = `${resumePdfPath}.tmp`;
      
      // This is a placeholder - replace with your actual PDF generation
      const resumePdfContent = '%PDF-1.7\n...';
      await fs.writeFile(resumePdfTempPath, resumePdfContent, 'utf-8');
      await fs.rename(resumePdfTempPath, resumePdfPath);
      
      // Generate cover letter PDF
      logger.info(`Generating cover letter PDF [${traceId}]`);
      const clPdfTempPath = `${clPdfPath}.tmp`;
      
      // This is a placeholder - replace with your actual PDF generation
      const clPdfContent = '%PDF-1.7\n...';
      await fs.writeFile(clPdfTempPath, clPdfContent, 'utf-8');
      await fs.rename(clPdfTempPath, clPdfPath);
      
      // Convert paths to URLs
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const resumePdfUrl = `${baseUrl}/resumes/${path.basename(resumePdfPath)}`;
      const clPdfUrl = `${baseUrl}/resumes/${path.basename(clPdfPath)}`;
      
      // Increment usage and get updated counts
      const usage = await incrementUsage('resume_kit');
      
      logger.info(`Resume generation complete [${traceId}], usage=${usage.count}/${usage.limit}`);
      return NextResponse.json({
        ok: true,
        traceId,
        provider: { 
          resume: { provider: tr.provider, model: tr.model }, 
          coverLetter: { provider: cl.provider, model: cl.model } 
        },
        files: { 
          resumePdf: resumePdfUrl, 
          coverLetterPdf: clPdfUrl 
        },
        tailored: { 
          resume: tr.result, 
          coverLetter: cl.result 
        },
        usage: {
          count: usage.count,
          limit: usage.limit,
          remaining: usage.remaining
        }
      }, { status: 200 });
    } catch (e: any) {
      logger.error(`PDF generation failed [${traceId}]`, e);
      return NextResponse.json({ 
        error: 'PDF_GENERATION_FAILED', 
        details: e?.message, 
        traceId
      }, { status: 500 });
    }
  } catch (e: any) {
    logger.error(`Unexpected error [${traceId}]`, e);
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR', 
      details: e?.message,
      traceId
    }, { status: 500 });
  }
}