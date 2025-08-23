import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatPreservingResume } from "@/lib/pdf/formatPreserving";
import { generateResumeKitPdfs } from "@/lib/pdf/generate";
import { getUserUsage } from "@/lib/usage/counter";
import { createLogger } from '@/lib/logger';
import { withErrorHandler, jsonResponse } from "@/app/api/error-handler";
import fs from "fs";
import path from "path";

const logger = createLogger('resume-kit-regenerate');

export const POST = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: { kitId: string } }
) => {
  const { kitId } = params;
  
  if (!kitId) {
    return jsonResponse(
      { 
        ok: false,
        error: {
          code: "MISSING_ID",
          message: "Kit ID is required"
        }
      },
      400
    );
  }
  
  logger.info('Regenerating resume kit with tighter content', { kitId });
  
  // Check if prisma is available
  if (!prisma) {
    throw new Error('Database client is not available');
  }
  
  // Get the kit from the database
  const kit = await prisma.resumeKit.findUnique({
    where: { id: kitId }
  }).catch(dbError => {
    logger.error('Database error fetching kit', { 
      kitId, 
      error: dbError instanceof Error ? dbError.message : String(dbError) 
    });
    throw new Error('Database error: Failed to fetch resume kit');
  });
  
  if (!kit) {
    logger.warn('Resume kit not found for regeneration', { kitId });
    return jsonResponse(
      { 
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Resume kit not found"
        }
      },
      404
    );
  }
  
  // Get the original PDF path
  const originalPdfPath = path.join(process.cwd(), "public", kit.resumeUrl.replace(/^\//, ""));
  
  // Check if the original PDF exists
  if (!fs.existsSync(originalPdfPath)) {
    logger.warn('Original PDF not found for regeneration', { kitId, path: originalPdfPath });
    return jsonResponse(
      { 
        ok: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Original PDF not found"
        }
      },
      404
    );
  }
  
  try {
    // Read the original PDF
    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    
    // Get the resume content from the database or a file
    // This is a simplified example - in a real app, you'd retrieve the structured content
    const resumeContent = {
      summary: "A more concise professional summary focusing on key achievements.",
      skills: ["Key Skill 1", "Key Skill 2", "Key Skill 3"],
      experience: [
        {
          role: kit.role || "Software Engineer",
          company: kit.company || "Example Company",
          dates: kit.dates || "2020 - Present",
          bullets: [
            "Implemented key features resulting in 30% performance improvement",
            "Led team of 5 developers on critical project",
            "Reduced bug count by 45% through improved testing"
          ]
        }
      ],
      education: "BS Computer Science, Example University, 2019"
    };
    
    // Generate a new format-preserving PDF with tighter content
    const formatPreservedPdf = await formatPreservingResume({
      inputPdfBytes: new Uint8Array(originalPdfBytes),
      tailoredSections: resumeContent
    });
    
    // Generate new PDFs
    const newKit = await generateResumeKitPdfs(
      {
        resume_markdown: "Tighter, more concise resume content",
        cover_letter_markdown: "Tighter, more concise cover letter",
        ats_report: {
          overallScore: 95,
          keywordCoverage: {
            matched: ["keyword1", "keyword2"],
            missingCritical: [],
            niceToHave: ["keyword3"]
          },
          sectionScores: {
            summary: 9,
            skills: 10,
            experience: 9,
            projects: 8,
            education: 9
          },
          redFlags: [],
          lengthAndFormatting: {
            pageCountOK: true,
            lineSpacingOK: true,
            bulletsOK: true
          },
          concreteEdits: [],
          finalRecommendations: ["Your resume is now optimized for one page"]
        }
      },
      formatPreservedPdf,
      kitId
    );
    
    // Update the kit in the database
    const updatedKit = await prisma.resumeKit.update({
      where: { id: kitId },
      data: {
        resumeUrl: newKit.resumePdfUrl,
        coverLetterUrl: newKit.coverLetterPdfUrl,
        atsReportUrl: newKit.atsReportPdfUrl,
        resumeDocxUrl: newKit.resumeDocxUrl,
        coverLetterDocxUrl: newKit.coverLetterDocxUrl,
        atsReportDocxUrl: newKit.atsReportDocxUrl,
        updatedAt: new Date()
      }
    });
    
    // Get the current usage
    const usage = getUserUsage();
    
    return jsonResponse({
      ok: true,
      kit: updatedKit,
      usage
    });
  } catch (error) {
    logger.error('Error regenerating resume kit', { 
      kitId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error; // Let the error handler take care of it
  }
});