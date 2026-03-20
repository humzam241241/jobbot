import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createLogger } from "@/lib/logger";
import { generateResumeKit } from "@/lib/ai/orchestrator";
import { renderMarkdownToPDF, saveFile } from "@/lib/artifacts";
import { JobDescriptionSchema, ResumeInputSchema } from "@/lib/zod";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Input validation schema
const RequestSchema = z.object({
  jobDescription: JobDescriptionSchema,
  userProfileId: z.string().optional(),
  providerPreference: z.enum(['openai', 'anthropic', 'google', 'auto']).optional().default('auto'),
  model: z.string().optional(),
  resumeText: z.string().optional(),
});

/**
 * Generate a resume kit based on job description and resume
 */
export async function POST(req: NextRequest) {
  const telemetryId = uuidv4();
  const logger = createLogger('generate-resume-kit-api', telemetryId);
  const startTime = Date.now();
  
  logger.info('Received generate-resume-kit request');
  
  try {
    // Check authentication if not in development
    if (process.env.NODE_ENV !== 'development') {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          { 
            ok: false, 
            code: 'AUTH', 
            message: 'Authentication required',
            telemetryId 
          },
          { status: 401 }
        );
      }
    }
    
    // Parse request body
    const body = await req.json();
    
    // Validate request
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Validation failed', { 
        errors: validationResult.error.errors 
      });
      
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION',
          message: 'Invalid request data',
          details: validationResult.error.errors,
          telemetryId,
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Extract job description text
    let jobDescriptionText = '';
    if (data.jobDescription.jobDescriptionText) {
      jobDescriptionText = data.jobDescription.jobDescriptionText;
    } else if (data.jobDescription.jobUrl || data.jobDescription.jobPostingUrl) {
      // In a real implementation, you might scrape the job description from the URL
      jobDescriptionText = `Job URL: ${data.jobDescription.jobUrl || data.jobDescription.jobPostingUrl}`;
    } else {
      return NextResponse.json(
        {
          ok: false,
          code: 'VALIDATION',
          message: 'Job description is required',
          telemetryId,
        },
        { status: 400 }
      );
    }
    
    // Generate resume kit
    const result = await generateResumeKit({
      userId: data.userProfileId || 'anonymous',
      jobDescription: jobDescriptionText,
      resumeText: data.resumeText,
      providerPreference: data.providerPreference,
      telemetryId,
    });
    
    // Handle generation errors
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    
    // Generate PDFs
    logger.info('Generating PDFs from markdown');
    const pdfs: { name: string; url: string }[] = [];
    
    try {
      // Generate resume PDF
      const resumePdf = await renderMarkdownToPDF(result.artifacts.resumeMd, { 
        title: 'Tailored Resume' 
      });
      
      // Save resume PDF
      const resumeFile = await saveFile(resumePdf, {
        mime: 'application/pdf',
        name: `resume_${Date.now()}.pdf`,
        telemetryId,
      });
      
      pdfs.push(resumeFile);
      
      // Generate cover letter PDF
      const coverLetterPdf = await renderMarkdownToPDF(result.artifacts.coverLetterMd, { 
        title: 'Cover Letter' 
      });
      
      // Save cover letter PDF
      const coverLetterFile = await saveFile(coverLetterPdf, {
        mime: 'application/pdf',
        name: `cover_letter_${Date.now()}.pdf`,
        telemetryId,
      });
      
      pdfs.push(coverLetterFile);
      
      // Generate ATS report (simple for now)
      const atsReportMd = `
# ATS Compatibility Report

## Summary
This resume has been optimized for ATS compatibility with the target job description.

## Keyword Matches
The resume includes relevant keywords and phrases from the job description.

## Format Analysis
- Clean, ATS-friendly format
- Proper section headings
- Bullet points for easy scanning
- No images, charts, or complex formatting that could confuse ATS systems

## Recommendations
- Submit as PDF to maintain formatting
- Include a plain text version if requested
- Customize file name to include your name and the job title
      `;
      
      const atsReportPdf = await renderMarkdownToPDF(atsReportMd, { 
        title: 'ATS Compatibility Report' 
      });
      
      // Save ATS report PDF
      const atsReportFile = await saveFile(atsReportPdf, {
        mime: 'application/pdf',
        name: `ats_report_${Date.now()}.pdf`,
        telemetryId,
      });
      
      pdfs.push(atsReportFile);
    } catch (error) {
      logger.error('Error generating PDFs', { error });
      
      // Continue with partial results
      result.partial = true;
    }
    
    // Update artifacts with PDFs
    result.artifacts.pdfs = pdfs;
    
    // Calculate processing time
    const processingTime = Date.now() - startTime;
    logger.info('Request completed successfully', { processingTime });
    
    // Return response
    return NextResponse.json({
      ...result,
      processingTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Unexpected error', { error });
    
    return NextResponse.json(
      {
        ok: false,
        code: 'UNKNOWN',
        message: error.message || 'An unexpected error occurred',
        telemetryId,
      },
      { status: 500 }
    );
  }
}
