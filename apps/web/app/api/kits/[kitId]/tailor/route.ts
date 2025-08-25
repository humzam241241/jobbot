import { NextRequest, NextResponse } from "next/server";
import { runTailorPipeline } from "@/server/pipeline";
import { createLogger } from '@/lib/logger';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { kitFileExists } from "@/lib/fs/storage";

const logger = createLogger('api-kits-tailor');

/**
 * Tailors a resume to a job description
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { kitId: string }}
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Check if input.docx exists
    const hasInputFile = await kitFileExists(params.kitId, 'input.docx');
    if (!hasInputFile) {
      return NextResponse.json({ 
        success: false, 
        error: 'No source document found. Please upload a DOCX file first.' 
      }, { status: 400 });
    }
    
    // Parse request body
    const { jobDescription, company, provider, model } = await req.json();
    
    if (!jobDescription) {
      return NextResponse.json({ 
        success: false, 
        error: 'Job description is required' 
      }, { status: 400 });
    }
    
    logger.info(`Tailoring resume for kit ${params.kitId}`);
    
    // Run the tailoring pipeline
    const result = await runTailorPipeline(params.kitId, jobDescription, {
      provider,
      model,
      company
    });
    
    // Prepare the response
    const response = {
      success: true,
      data: {
        files: {
          resume: {
            docx: `/api/kits/${params.kitId}/downloads?file=resume_tailored.docx`,
            pdf: result.libreOfficeInstalled 
              ? `/api/kits/${params.kitId}/downloads?file=resume_tailored.pdf` 
              : null
          },
          coverLetter: {
            docx: `/api/kits/${params.kitId}/downloads?file=cover_letter.docx`,
            pdf: result.libreOfficeInstalled 
              ? `/api/kits/${params.kitId}/downloads?file=cover_letter.pdf` 
              : null
          },
          atsReport: {
            docx: `/api/kits/${params.kitId}/downloads?file=ats_report.docx`,
            pdf: result.libreOfficeInstalled 
              ? `/api/kits/${params.kitId}/downloads?file=ats_report.pdf` 
              : null
          }
        },
        libreOfficeInstalled: result.libreOfficeInstalled
      }
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Error tailoring resume', { 
      error: error.message, 
      kitId: params.kitId 
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to tailor resume' 
    }, { status: 500 });
  }
}
