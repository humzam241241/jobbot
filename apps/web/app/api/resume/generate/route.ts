import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, getMockUser, createMockResumeKit, updateMockResumeKit } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { debugLogger } from '@/lib/utils/debug-logger';
import { llm } from '@/lib/providers/llm';
import type { ResumeKit } from '@/lib/types/resumeKit';
import { createAtsReport } from '@/lib/pipeline/atsReport';
import { generateCoverLetter } from '@/lib/cover-letter/generate';
import { SYSTEM_COVER_LETTER } from '@/lib/prompts/resumePrompts';

// Commented out imports that are causing issues - will be re-enabled once fixed
// import { extractTextItems, isLikelyScannedPdf } from '@/lib/pdf/analyzer/extract';
// import { groupIntoLines, groupIntoBlocks } from '@/lib/pdf/analyzer/blocks';
// import { buildSectionMap } from '@/lib/pdf/analyzer/sections';
// import { processScannedPdf, createBlocksFromOcrTextItems } from '@/lib/pdf/analyzer/ocr';
// import { parseResumeJson, SYSTEM_PROMPT, createUserPrompt } from '@/lib/pdf/normalize/json-schema';
// import { mapResumeDataToSlots } from '@/lib/pdf/normalize/map-json-to-slots';
// import { renderResume, renderFallbackResume } from '@/lib/pdf/renderer/render';
// import { createDebugOverlay, logDebug } from '@/lib/pdf/debug/overlay';

// Helper: DB enabled?
const hasValidDatabaseUrl = typeof process.env.DATABASE_URL === 'string' && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || '');
const isDbEnabled = process.env.SKIP_DB !== '1' && !!hasValidDatabaseUrl && !!prisma;

// Debug mode
const DEBUG_RENDER = process.env.DEBUG_RENDER === '1';
const RESUME_RENDER_STRICT = process.env.RESUME_RENDER_STRICT === 'true';

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
 * Main API handler for resume generation
 */
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
      
      // Save original resume for analysis
      const originalResumePath = path.join(kitDir, 'original.pdf');
      fs.writeFileSync(originalResumePath, resumeBuffer);
      
      // Step 1: Extract text from the PDF
      log('Extracting text from PDF');
      
      let resumeText = "";
      
      try {
        // Import PDF extraction function
        const { extractTextFromPdf } = require('@/lib/pdf/extract');
        
        // Extract text from PDF
        const extractResult = await extractTextFromPdf(resumeBuffer);
        resumeText = extractResult.text;
        
        log('PDF text extracted', { 
          pages: extractResult.pages, 
          textLength: resumeText.length 
        });
      } catch (extractError) {
        log('Error extracting text from PDF', { error: String(extractError) });
        
        // Provide a fallback text for processing
        resumeText = `
          This is a fallback text used when PDF extraction fails.
          The system will still attempt to generate a tailored resume, cover letter, and ATS report.
          However, the results may not be as accurate as they would be with proper PDF text extraction.
        `;
        
        log('Using fallback text for processing', { textLength: resumeText.length });
      }
      
      // Step 1.5: Generate tailored resume content
      log('Generating tailored resume content');
      
      const SYSTEM_TAILORED_RESUME = `
      You are an expert resume writer. Your task is to tailor the provided resume to match the job description.
      Focus on:
      1. Highlighting relevant skills and experience
      2. Using keywords from the job description
      3. Quantifying achievements where possible
      4. Maintaining the original resume structure and sections
      
      Return the tailored resume content in markdown format, preserving the original sections and layout.
      `;
      
      const tailoredResumePrompt = `
      JOB DESCRIPTION:
      ${jobDescription}
      
      ORIGINAL RESUME:
      ${resumeText}
      
      Please tailor this resume to match the job description. Keep the same overall structure but highlight relevant skills and experience.
      `;
      
      const tailoredResumeResponse = await llm.complete({
        system: SYSTEM_TAILORED_RESUME,
        user: tailoredResumePrompt,
        model: model || 'auto'
      });
      
      if (tailoredResumeResponse) {
        log('Tailored resume content generated', { responseLength: tailoredResumeResponse.length });
        
        // Save tailored resume content as markdown
        const tailoredResumeMdPath = path.join(kitDir, 'tailored.md');
        fs.writeFileSync(tailoredResumeMdPath, tailoredResumeResponse);
        
        // Save tailored resume as HTML for now (since PDF generation is having issues)
        const tailoredResumeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tailored Resume</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
            h1, h2, h3 { color: #333; }
            ul { margin-left: 20px; }
            .section { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Tailored Resume</h1>
          <div class="content">
            ${tailoredResumeResponse
              .replace(/^# (.*)/gm, '<h1>$1</h1>')
              .replace(/^## (.*)/gm, '<h2>$1</h2>')
              .replace(/^### (.*)/gm, '<h3>$1</h3>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/- (.*)/g, '<li>$1</li>')
              .replace(/<li>/g, '<ul><li>')
              .replace(/<\/li>/g, '</li></ul>')
              .replace(/<\/ul><ul>/g, '')
            }
          </div>
        </body>
        </html>
        `;
        
        const tailoredResumeHtmlPath = path.join(kitDir, 'tailored.html');
        fs.writeFileSync(tailoredResumeHtmlPath, tailoredResumeHtml);
        log('Tailored resume HTML saved', { path: tailoredResumeHtmlPath });
      } else {
        log('Failed to generate tailored resume content');
      }
      
      // Step 2: Generate cover letter
      log('Generating cover letter');
      let hasCoverLetter = false;
      let coverLetterPath = '';
      
      try {
        // Updated cover letter system prompt
        const UPDATED_COVER_LETTER_PROMPT = `
        You are a professional cover letter writer. Your task is to create a compelling cover letter that:
        
        1. Starts with the current date, followed by the hiring manager/company information
        2. Begins with a strong introduction mentioning the specific position and company
        3. Highlights the candidate's relevant skills and experiences that match the job description
        4. Includes specific achievements and examples that demonstrate value
        5. Explains why the candidate is interested in this specific company and role
        6. Ends with a strong closing paragraph and professional sign-off
        7. Is properly formatted and fills a full page (approximately 400-500 words)
        
        The cover letter should be formal but conversational, confident but not arrogant, and tailored specifically to the job description.
        
        Format the cover letter properly with:
        - Current date at the top
        - Employer's information (derived from job description)
        - Greeting (e.g., "Dear Hiring Manager," or specific name if available)
        - 3-4 well-structured paragraphs
        - Professional closing (e.g., "Sincerely,")
        - Candidate's name
        `;
        
        const coverLetterPrompt = `
        JOB DESCRIPTION:
        ${jobDescription}
        
        RESUME:
        ${resumeText}
        
        Please write a professional cover letter for this position. Start with today's date (${new Date().toLocaleDateString()}), include the position title and company name in the header and opening paragraph. Make sure the letter fills a full page.
        `;
        
        const coverLetterResponse = await llm.complete({
          system: UPDATED_COVER_LETTER_PROMPT,
          user: coverLetterPrompt,
          model: model || 'auto'
        });
        
        if (coverLetterResponse) {
          log('Cover letter generated', { responseLength: coverLetterResponse.length });
          
          try {
            // Save raw cover letter content
            const coverLetterRawPath = path.join(kitDir, 'cover.txt');
            fs.writeFileSync(coverLetterRawPath, coverLetterResponse);
            
            // Create HTML cover letter with better formatting
            const coverLetterHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Cover Letter</title>
              <style>
                body { 
                  font-family: 'Times New Roman', Times, serif; 
                  margin: 40px; 
                  line-height: 1.5;
                  font-size: 12pt;
                }
                .date { 
                  text-align: right; 
                  margin-bottom: 20px; 
                }
                .header { 
                  margin-bottom: 30px; 
                }
                .greeting { 
                  margin-bottom: 20px; 
                }
                .content { 
                  margin-bottom: 30px; 
                }
                .signature { 
                  margin-top: 40px; 
                }
                p { 
                  margin-bottom: 15px; 
                }
              </style>
            </head>
            <body>
              <div class="cover-letter">
                ${formatCoverLetterHtml(coverLetterResponse)}
              </div>
            </body>
            </html>
            `;
            
            // Save cover letter to kit directory
            coverLetterPath = path.join(kitDir, 'cover.html');
            fs.writeFileSync(coverLetterPath, coverLetterHtml);
            log('Cover letter saved', { path: coverLetterPath });
            hasCoverLetter = true;
          } catch (saveError) {
            log('Error saving cover letter', { error: String(saveError) });
          }
        } else {
          log('Failed to generate cover letter - empty response');
        }
      } catch (coverLetterError) {
        log('Error generating cover letter', { error: String(coverLetterError) });
        // Continue with the process even if cover letter generation fails
      }
      
      // Helper function to format cover letter HTML
      function formatCoverLetterHtml(text) {
        // Split the text into lines
        const lines = text.split('\n');
        
        // Identify parts of the cover letter
        let dateIndex = -1;
        let addressIndex = -1;
        let greetingIndex = -1;
        let signatureIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Look for date format
          if (dateIndex === -1 && /^\w+\s+\d+,\s+\d{4}$|^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{1,2}-\d{1,2}-\d{4}$/.test(line)) {
            dateIndex = i;
          }
          // Look for greeting
          if (greetingIndex === -1 && /^Dear\s|^To\s/.test(line)) {
            greetingIndex = i;
          }
          // Look for signature
          if (signatureIndex === -1 && /^Sincerely|^Best|^Regards|^Yours|^Thank/.test(line)) {
            signatureIndex = i;
          }
        }
        
        // If we couldn't identify the parts, use a simple approach
        if (dateIndex === -1 && greetingIndex === -1 && signatureIndex === -1) {
          return `<p>${text.split('\n\n').join('</p><p>')}</p>`;
        }
        
        // Build the formatted HTML
        let html = '';
        
        // Date
        if (dateIndex !== -1) {
          html += `<div class="date">${lines[dateIndex]}</div>`;
        } else {
          html += `<div class="date">${new Date().toLocaleDateString()}</div>`;
        }
        
        // Address block (if any)
        if (addressIndex !== -1 && greetingIndex !== -1 && addressIndex < greetingIndex) {
          html += '<div class="header">';
          for (let i = addressIndex; i < greetingIndex; i++) {
            if (lines[i].trim()) {
              html += `${lines[i]}<br>`;
            }
          }
          html += '</div>';
        }
        
        // Greeting
        if (greetingIndex !== -1) {
          html += `<div class="greeting">${lines[greetingIndex]},</div>`;
        }
        
        // Content
        html += '<div class="content">';
        const startIndex = greetingIndex !== -1 ? greetingIndex + 1 : 0;
        const endIndex = signatureIndex !== -1 ? signatureIndex : lines.length;
        
        let paragraph = '';
        for (let i = startIndex; i < endIndex; i++) {
          if (lines[i].trim() === '') {
            if (paragraph) {
              html += `<p>${paragraph}</p>`;
              paragraph = '';
        }
      } else {
            paragraph += (paragraph ? ' ' : '') + lines[i];
          }
        }
        if (paragraph) {
          html += `<p>${paragraph}</p>`;
        }
        html += '</div>';
        
        // Signature
        if (signatureIndex !== -1) {
          html += '<div class="signature">';
          for (let i = signatureIndex; i < lines.length; i++) {
            if (lines[i].trim()) {
              html += `${lines[i]}<br>`;
            }
          }
          html += '</div>';
        }
        
        return html;
      }
      
      // Step 3: Generate ATS report
      log('Generating ATS report');
      let hasAtsReport = false;
      let atsReportPath = '';
      
      try {
        const atsReport = await createAtsReport({
          resumeText,
          jdText: jobDescription,
          kitId: kit.id
        });
        
        // Verify ATS report was created
        const atsReportFilePath = path.join(ARTIFACTS_DIR, kit.id, 'ats.html');
        if (fs.existsSync(atsReportFilePath)) {
          log('ATS report generated and saved', { score: atsReport.score, path: atsReportFilePath });
          hasAtsReport = true;
          atsReportPath = `/kits/${kit.id}/ats.html`;
        } else {
          log('ATS report generated but file not found', { score: atsReport.score });
        }
      } catch (atsError) {
        log('Error generating ATS report', { error: String(atsError) });
        // Continue with the process even if ATS report generation fails
      }
      
      // Check if original PDF was saved successfully
      const originalPdfPath = path.join(kitDir, 'original.pdf');
      const hasOriginalPdf = fs.existsSync(originalPdfPath);
      
      if (!hasOriginalPdf) {
        throw new Error('Failed to save original PDF');
      }
      
      // Check if tailored resume was generated
      const tailoredResumeHtmlPath = path.join(kitDir, 'tailored.html');
      const hasTailoredResume = fs.existsSync(tailoredResumeHtmlPath);
      
      // Update kit status
      const updateData: Partial<ResumeKit> = {
        status: 'completed',
        tailoredResume: hasTailoredResume ? `/kits/${kit.id}/tailored.html` : `/kits/${kit.id}/original.pdf`,
        originalResume: `/kits/${kit.id}/original.pdf`,
        coverLetter: hasCoverLetter ? `/kits/${kit.id}/cover.html` : undefined,
        atsReport: hasAtsReport ? `/kits/${kit.id}/ats.html` : undefined,
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
          artifacts: {
            resume: updateData.tailoredResume,
            originalResume: updateData.originalResume,
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