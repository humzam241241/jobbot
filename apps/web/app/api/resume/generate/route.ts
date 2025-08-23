import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { extractTextFromPdf } from '@/lib/pdf/extract';
import { generatePdf } from '@/lib/pdf/generate';
import { generateAtsReport } from '@/lib/ats/analyzer';
import { generateCoverLetter } from '@/lib/cover-letter/generate';
import { autoRewrite } from '@/lib/ai/auto';
import { z } from 'zod';

const logger = createLogger('resume-api');

// Custom file validation
const isValidFile = (file: unknown): file is File => {
  return file instanceof File && 
    (file.type === 'application/pdf' || 
     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
};

// Input validation schema
const RequestSchema = z.object({
  file: z.custom<File>(
    (data) => isValidFile(data),
    { message: "File must be a PDF or DOCX document" }
  ),
  jobDescription: z.string().optional(),
  jobUrl: z.string().optional().transform(url => {
    if (!url) return undefined;
    try {
      return new URL(url).toString();
    } catch {
      return url; // Keep the original string if not a valid URL
    }
  }),
  provider: z.enum(['auto', 'openai', 'anthropic', 'google']).default('auto'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional()
}).refine(data => {
  // If jobUrl is provided but not a valid URL, require jobDescription
  if (data.jobUrl && !data.jobDescription) {
    try {
      new URL(data.jobUrl);
      return true;
    } catch {
      return false;
    }
  }
  // Otherwise, require either jobDescription or jobUrl
  return Boolean(data.jobDescription) || Boolean(data.jobUrl);
}, {
  message: "Either a valid job description or a valid URL must be provided"
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Log raw input for debugging
    logger.info('Received form data', {
      fileInfo: formData.get('file') ? {
        type: (formData.get('file') as File).type,
        name: (formData.get('file') as File).name,
        size: (formData.get('file') as File).size
      } : null,
      provider: formData.get('provider'),
      model: formData.get('model'),
      hasJobDescription: Boolean(formData.get('jobDescription')),
      hasJobUrl: Boolean(formData.get('jobUrl')),
      rawJobUrl: formData.get('jobUrl'),
      rawJobDescription: formData.get('jobDescription')?.toString().slice(0, 100)
    });

    const rawInput = {
      file: formData.get('file'),
      jobDescription: formData.get('jobDescription')?.toString() || undefined,
      jobUrl: formData.get('jobUrl')?.toString() || undefined,
      provider: formData.get('provider')?.toString() || 'auto',
      model: formData.get('model')?.toString(),
      temperature: formData.get('temperature') ? Number(formData.get('temperature')) : undefined,
      maxTokens: formData.get('maxTokens') ? Number(formData.get('maxTokens')) : undefined
    };

    // Validate input
    const validationResult = RequestSchema.safeParse(rawInput);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      logger.error('Validation failed', { 
        errors,
        rawInput: {
          ...rawInput,
          file: rawInput.file ? {
            type: (rawInput.file as File).type,
            name: (rawInput.file as File).name,
            size: (rawInput.file as File).size
          } : null
        }
      });
      
    return NextResponse.json({ 
        error: { 
          message: 'Invalid input', 
          details: errors
        } 
      }, { status: 400 });
    }

    const input = validationResult.data;
    logger.info('Starting resume generation', { 
      provider: input.provider,
      model: input.model,
      fileName: input.file.name,
      fileSize: input.file.size,
      fileType: input.file.type,
      hasJobUrl: Boolean(input.jobUrl),
      hasJobDescription: Boolean(input.jobDescription)
    });

    // Extract text from resume
    const fileBuffer = Buffer.from(await input.file.arrayBuffer());
    const resumeText = await extractTextFromPdf(fileBuffer);
    
    if (!resumeText || resumeText.length < 50) {
      logger.error('Insufficient text extracted', { 
        textLength: resumeText?.length || 0,
        fileName: input.file.name 
      });
      return NextResponse.json({ 
        error: { 
          message: 'Could not extract sufficient text from the resume file',
          details: { textLength: resumeText?.length || 0 }
        } 
      }, { status: 400 });
    }
    
    // Get job description from URL if needed
    let finalJobDescription = input.jobDescription || '';
    if (!finalJobDescription && input.jobUrl) {
      try {
        logger.info('Fetching job description from URL', { url: input.jobUrl });
        const response = await fetch('/api/extract-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: input.jobUrl })
        });
        
        if (response.ok) {
          const data = await response.json();
          finalJobDescription = data.text;
          logger.info('Successfully extracted job description', { 
            length: finalJobDescription.length 
          });
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Failed to extract job description');
        }
      } catch (error) {
        logger.error('Error extracting job from URL', { error });
        return NextResponse.json({ 
          error: { 
            message: 'Failed to extract job description from URL',
            details: error instanceof Error ? error.message : 'Unknown error'
          } 
        }, { status: 400 });
      }
    }

    if (!finalJobDescription) {
      return NextResponse.json({ 
        error: { message: 'Job description is required' } 
      }, { status: 400 });
    }

    // Generate optimized resume using AI with fallback
    const aiResponse = await autoRewrite({
      model: input.model,
      jobDescription: finalJobDescription,
      resumeMarkdown: resumeText,
      temperature: input.temperature,
      maxTokens: input.maxTokens
    }, input.provider === 'auto' ? undefined : [input.provider]);

    if (!aiResponse.ok) {
      logger.error('AI generation failed', { error: aiResponse.error });
      return NextResponse.json({ 
        error: { 
          message: 'AI generation failed',
          details: aiResponse.error
        } 
      }, { status: 502 });
    }

    // Parse AI response
    let parsedContent;
    try {
      parsedContent = JSON.parse(aiResponse.content);
      logger.info('Successfully parsed AI response', {
        sections: Object.keys(parsedContent)
      });
    } catch (e) {
      logger.error('Failed to parse AI response', { 
        error: e,
        content: aiResponse.content.slice(0, 100) + '...' 
      });
      return NextResponse.json({ 
        error: { 
          message: 'Failed to parse AI response',
          details: e instanceof Error ? e.message : 'Invalid JSON'
        } 
      }, { status: 500 });
    }

    // Generate ATS report
    const atsReport = await generateAtsReport(parsedContent.summary || '', finalJobDescription);
    logger.info('Generated ATS report', { score: atsReport.score });
      
      // Generate resume PDF
    const { buffer: pdfBuffer, filePath: resumePath } = await generatePdf({
      content: JSON.stringify(parsedContent, null, 2),
      title: 'Optimized Resume',
      maxPages: 1
    });

    // Generate cover letter
    const { buffer: coverBuffer, filePath: coverPath } = await generateCoverLetter(
      parsedContent.coverLetter || 'No cover letter content available'
    );

    logger.info('Successfully generated all documents', {
      provider: aiResponse.providerUsed,
      model: aiResponse.modelUsed,
      resumePath,
      coverPath
    });

      return NextResponse.json({
        ok: true,
      providerUsed: aiResponse.providerUsed,
      modelUsed: aiResponse.modelUsed,
      resumeUrl: `/api/resume/download?id=${resumePath}&type=resume`,
      coverLetterUrl: `/api/resume/download?id=${coverPath}&type=cover`,
      ats: atsReport
    });
  } catch (error: any) {
    logger.error('Unhandled error in resume generation', { 
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    });
    return NextResponse.json({ 
      error: { 
        message: 'An unexpected error occurred',
        details: error.message || 'Internal server error'
      } 
    }, { status: 500 });
  }
}