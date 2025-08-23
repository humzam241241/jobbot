import { NextRequest } from "next/server";
import { z } from "zod";
import { extractTextFromPdf } from "@/lib/pdf/extract";
import { extractTextFromNodePdf } from "@/lib/pdf/node-pdf-parser";
import { generateWithAuto } from "@/lib/ai/router";
import { resumeSuperPrompt } from "@/lib/prompts/resume";
import { generateResumeKitPdfs } from "@/lib/pdf/generate";
import { createLogger } from '@/lib/logger';
// Import but don't use directly - we'll try/catch this
import { formatPreservingResume } from "@/lib/pdf/formatPreserving";
import { prisma } from "@/lib/db";
import { incrementUsage, getUserUsage, hasReachedLimit } from "@/lib/usage/counter";
import { v4 as uuidv4 } from 'uuid';
import { sanitizeForJson } from "@/lib/utils/safeJson";
import { withErrorHandler, jsonResponse } from "@/app/api/error-handler";

const logger = createLogger('resume-api');

export const dynamic = "force-dynamic"; // safe for dev

const formSchema = z.object({
  file: z.instanceof(Blob),
  jobUrl: z.string().optional(),
  jobDescription: z.string().optional(),
  provider: z.enum(["auto", "google", "openai", "anthropic"]).default("auto"),
  model: z.string().optional()
});

// Original handler wrapped with error handling
export const POST = withErrorHandler(async (req: NextRequest) => {
  const form = await req.formData();

  // Parse and validate input
  const input = formSchema.parse({
    file: form.get("file"),
    jobUrl: (form.get("jobUrl") || "") as string,
    jobDescription: (form.get("jobDescription") || "") as string,
    provider: (form.get("provider") || "auto") as any,
    model: (form.get("model") || "") as string
  });

  const file = input.file as File;

  logger.info('Received form data', {
    fileInfo: { type: file.type, name: file.name, size: file.size },
    provider: input.provider,
    model: input.model || undefined,
    hasJobDescription: Boolean(input.jobDescription),
    hasJobUrl: Boolean(input.jobUrl),
    rawJobUrl: (input.jobUrl || "").slice(0, 80),
    rawJobDescription: (input.jobDescription || "").slice(0, 80)
  });

  // Check usage limit before proceeding
  if (hasReachedLimit()) {
    logger.warn('User has reached usage limit');
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "USAGE_LIMIT", 
          message: "You have reached your usage limit. Please try again later." 
        },
        usage: getUserUsage()
      },
      429
    );
  }

  // Validate file type
  if (!file || file.type !== "application/pdf") {
    logger.warn('Invalid file type', { type: file.type });
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "BAD_FILE", 
          message: "Please upload a PDF resume." 
        }
      },
      400
    );
  }

  // Extract text from PDF
  const buf = Buffer.from(await file.arrayBuffer());
  
  let extractedText = '';
  let pages = 0;
  
  try {
    // Try the Node.js compatible parser first
    logger.info('Attempting to extract text using Node PDF parser');
    extractedText = await extractTextFromNodePdf(buf);
    pages = 1; // We're only processing the first page for now
  } catch (extractError) {
    logger.warn('Node PDF parser failed, falling back to standard extractor', { 
      error: extractError instanceof Error ? extractError.message : String(extractError) 
    });
    
    // Fall back to the standard extractor
    const extracted = await extractTextFromPdf(buf);
    extractedText = extracted.text || '';
    pages = extracted.pages;
  }
  
  if (!extractedText) {
    logger.error('Failed to extract text from PDF', { pages });
    return jsonResponse(
      { 
        ok: false,
        error: { 
          code: "EMPTY_PDF", 
          message: "Could not read text from the PDF." 
        }
      },
      400
    );
  }

  logger.info('PDF text extracted', { 
    pages, 
    textLength: extractedText.length 
  });

  // Generate a unique ID for this kit
  const kitId = uuidv4();

  // Check if prisma is available
  if (!prisma) {
    throw new Error('Database client is not available');
  }

  // Use a transaction to ensure all operations succeed or fail together
  const result = await prisma.$transaction(async (tx) => {
    // Build prompt
    const prompt = resumeSuperPrompt({
      rawResumeText: extractedText,
      jobDescriptionText: input.jobDescription || ""
    });

    logger.info('Starting AI generation', {
      kitId,
      providerPreferred: input.provider,
      hasJobDescription: Boolean(input.jobDescription),
      resumeLength: extractedText.length
    });

    // Generate content with AI
    const result = await generateWithAuto(prompt, input.provider as any);

    logger.info('AI generation successful', {
      kitId,
      provider: result.providerUsed,
      resumeLength: result.resume_markdown.length,
      coverLetterLength: result.cover_letter_markdown.length,
      atsScore: result.ats_report.score || 0
    });

    // Generate format-preserving PDF if possible
    let formatPreservedPdf: Uint8Array | null = null;
    
    // Skip format-preserving PDF in Node.js environment for now
    // This avoids the DOMMatrix error
    logger.info('Skipping format-preserving PDF in Node environment, using standard PDF generation', { kitId });

    // Generate PDFs (either standard or use the format-preserved one)
    const kit = await generateResumeKitPdfs(result as any, formatPreservedPdf, kitId);

    logger.info('Resume kit generated', { kitId, ...kit });

    // Create a record in the database
    // @ts-ignore - Prisma transaction type issue
    const kitRecord = await tx.resumeKit.create({
      data: {
        id: kitId,
        provider: result.providerUsed,
        model: input.model || undefined,
        resumeUrl: kit.resumePdfUrl,
        coverLetterUrl: kit.coverLetterPdfUrl,
        atsReportUrl: kit.atsReportPdfUrl,
        resumeDocxUrl: kit.resumeDocxUrl,
        coverLetterDocxUrl: kit.coverLetterDocxUrl,
        atsReportDocxUrl: kit.atsReportDocxUrl,
        createdAt: new Date()
      }
    });

    // Increment usage only after successful generation
    const usage = await incrementUsage('resume-kit', tx);

    return {
      kitId,
      provider: result.providerUsed,
      results: kit,
      usage
    };
  });

  logger.info('Transaction completed successfully', { kitId });

  return jsonResponse({
    ok: true,
    kitId: result.kitId,
    provider: result.provider,
    results: result.results,
    usage: result.usage
  });
});