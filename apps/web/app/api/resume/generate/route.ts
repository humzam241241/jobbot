import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractTextFromPdf } from "@/lib/pdf/extract";
import { generateWithAuto } from "@/lib/ai/router";
import { resumeSuperPrompt } from "@/lib/prompts/resume";
import { generateResumeKitPdfs } from "@/lib/pdf/generate";
import { createLogger } from '@/lib/logger';

const logger = createLogger('resume-api');

export const dynamic = "force-dynamic"; // safe for dev

const formSchema = z.object({
  file: z.instanceof(Blob),
  jobUrl: z.string().optional(),
  jobDescription: z.string().optional(),
  provider: z.enum(["auto", "google", "openai", "anthropic"]).default("auto"),
  model: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
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

    // Validate file type
    if (!file || file.type !== "application/pdf") {
      logger.warn('Invalid file type', { type: file.type });
      return NextResponse.json(
        { error: { code: "BAD_FILE", message: "Please upload a PDF resume." } },
        { status: 400 }
      );
    }

    // Extract text from PDF
    const buf = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromPdf(buf);
    
    if (!extracted.text) {
      logger.error('Failed to extract text from PDF', { pages: extracted.pages });
      return NextResponse.json(
        { error: { code: "EMPTY_PDF", message: "Could not read text from the PDF." } },
        { status: 400 }
      );
    }

    logger.info('PDF text extracted', { 
      pages: extracted.pages, 
      textLength: extracted.text.length 
    });

    // Build prompt
    const prompt = resumeSuperPrompt({
      rawResumeText: extracted.text,
      jobDescriptionText: input.jobDescription || ""
    });

    logger.info('Starting AI generation', {
      providerPreferred: input.provider,
      hasJobDescription: Boolean(input.jobDescription),
      resumeLength: extracted.text.length
    });

    // Generate content with AI
    const result = await generateWithAuto(prompt, input.provider as any);

    logger.info('AI generation successful', {
      provider: result.providerUsed,
      resumeLength: result.resume_markdown.length,
      coverLetterLength: result.cover_letter_markdown.length,
      atsScore: result.ats_report.score
    });

    // Generate PDFs
    const kit = generateResumeKitPdfs(result);

    logger.info('Resume kit generated', kit);

    return NextResponse.json(
      {
        ok: true,
        provider: result.providerUsed,
        results: {
          ...kit
        }
      },
      { status: 200 }
    );
  } catch (e: any) {
    const details = e?.details || e?.raw || e?.response || e;
    logger.error('Error in resume generation', { 
      message: e?.message || String(e), 
      code: e?.code,
      details
    });

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: e?.code || "UNKNOWN",
          message: e?.message || "AI generation failed",
          details
        }
      },
      { status: 502 }
    );
  }
}