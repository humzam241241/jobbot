import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { extractTextFromPdf } from '@/lib/pdf/extract';
import { generatePdf } from '@/lib/pdf/generate';
import { generateAtsReport } from '@/lib/ats/analyzer';
import { modelRouter } from '@/lib/ai/router';
import { retryWithBackoff } from '@/lib/utils/retry';

const logger = createLogger('resume-api');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const jobDescription = formData.get('jobDescription') as string;
    const jobUrl = formData.get('jobUrl') as string;
    const provider = formData.get('provider') as string || 'auto';
    const model = formData.get('model') as string || 'default';

    if (!file) {
      return NextResponse.json({ error: { message: 'Resume file is required' } }, { status: 400 });
    }

    if (!jobDescription && !jobUrl) {
      return NextResponse.json({ error: { message: 'Job description or URL is required' } }, { status: 400 });
    }

    logger.info('Starting resume generation', { provider, model });

    // Extract text from resume
    const resumeBuffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractTextFromPdf(resumeBuffer);
    
    if (!resumeText || resumeText.length < 50) {
      return NextResponse.json({ 
        error: { message: 'Could not extract sufficient text from the resume file' } 
      }, { status: 400 });
    }

    // Get job description from URL if needed
    let finalJobDescription = jobDescription;
    if (!finalJobDescription && jobUrl) {
      try {
        const response = await fetch('/api/extract-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: jobUrl })
        });
        
        if (response.ok) {
          const data = await response.json();
          finalJobDescription = data.text;
        }
      } catch (error) {
        logger.error('Error extracting job from URL', { error });
        // Continue with empty job description
      }
    }

    if (!finalJobDescription) {
      return NextResponse.json({ 
        error: { message: 'Could not extract job description from URL' } 
      }, { status: 400 });
    }

    // Generate optimized resume and cover letter using AI
    const aiClient = modelRouter(provider, model);
    
    const aiResponse = await retryWithBackoff(async () => {
      return aiClient.generateResume({
        resumeText,
        jobDescription: finalJobDescription,
        includeOriginalContent: true, // Include original content from resume
      });
    }, 3);

    // Generate ATS report
    const atsReport = await generateAtsReport(aiResponse.resumeContent, finalJobDescription);

    // Generate PDF files
    const resumePdf = await generatePdf({
      content: aiResponse.resumeContent,
      title: `${aiResponse.name || 'Generated'} Resume`,
      originalContent: resumeText,
    });

    const coverLetterPdf = await generatePdf({
      content: aiResponse.coverLetterContent,
      title: `${aiResponse.name || 'Generated'} Cover Letter`,
    });

    // Generate unique URLs for the PDFs
    const resumeUrl = `/api/resume/download?id=${aiResponse.id}&type=resume`;
    const coverLetterUrl = `/api/resume/download?id=${aiResponse.id}&type=cover`;

    return NextResponse.json({
      success: true,
      resumeUrl,
      coverLetterUrl,
      ats: atsReport,
    });
  } catch (error: any) {
    logger.error('Error generating resume', { error });
    return NextResponse.json({ 
      error: { message: error.message || 'An error occurred during resume generation' } 
    }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};