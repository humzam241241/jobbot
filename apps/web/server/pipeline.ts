import { kitDir } from "../lib/fs/storage";
import { parseDocxToIR } from "../lib/extract/docx";
import { TailoringPlanSchema } from "../lib/ai/schemas";
import { applyPlan } from "../lib/ir/apply";
import { renderResumeDocx } from "../lib/render/resumeDocx";
import { renderCoverDocx } from "../lib/render/coverDocx";
import { renderAtsDocx } from "../lib/render/atsDocx";
import { docxToPdf, isLibreOfficeInstalled } from "../lib/render/convert";
import { callModel } from "../lib/ai/provider";
import { createLogger } from '@/lib/logger';

const logger = createLogger('pipeline');

interface TailorPipelineOptions {
  provider?: string;
  model?: string;
  company?: string;
}

interface TailorPipelineResult {
  resumePdf: string;
  coverPdf: string;
  atsPdf: string;
  resumeDocx: string;
  coverDocx: string;
  atsDocx: string;
  libreOfficeInstalled: boolean;
}

/**
 * Main pipeline for tailoring a resume to a job description
 * @param kitId The ID of the kit
 * @param jobDescription The job description
 * @param options Options for the pipeline
 * @returns Paths to the generated files
 */
export async function runTailorPipeline(
  kitId: string, 
  jobDescription: string,
  options: TailorPipelineOptions = {}
): Promise<TailorPipelineResult> {
  const dir = kitDir(kitId);
  const input = `${dir}/input.docx`;
  
  logger.info(`Starting tailoring pipeline for kit ${kitId}`);
  
  // Check if LibreOffice is installed
  const libreOfficeInstalled = await isLibreOfficeInstalled();
  logger.info(`LibreOffice installed: ${libreOfficeInstalled}`);
  
  // Step 1: Parse DOCX to IR
  logger.info('Parsing DOCX to IR');
  const ir = await parseDocxToIR(input);
  
  // Step 2: Generate tailoring plan with LLM
  logger.info('Generating tailoring plan');
  const prompt = `
You are a resume tailoring engine. Using the resume structure and this job description, produce a strict JSON TailoringPlan.

RESUME:
${JSON.stringify(ir, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Please analyze the resume and job description, then produce a TailoringPlan that:
1. Identifies the target role
2. Lists keywords that match between the resume and job description
3. Suggests bullets to add to specific sections (experience, projects, skills)
4. Identifies bullets that could be removed (if not relevant)
5. Rewrites the summary to be tailored to this job
6. Lists skills to add or remove
7. Provides any ordering hints or risks

Return ONLY the JSON object with no additional text.
`;

  const plan = await callModel({
    prompt,
    schema: TailoringPlanSchema,
    provider: options.provider as any,
    model: options.model
  });
  
  // Step 3: Apply plan to IR
  logger.info('Applying tailoring plan to IR');
  const tailoredIR = applyPlan(ir, plan);
  
  // Step 4: Render DOCX files
  logger.info('Rendering DOCX files');
  const resumeDocx = await renderResumeDocx(dir, tailoredIR);
  const coverDocx = await renderCoverDocx(dir, tailoredIR, plan, options.company);
  
  // Generate a simple ATS score based on matched keywords
  const atsScore = {
    overall: Math.min(98, Math.max(60, 70 + plan.matchedKeywords.length * 2)),
    notes: [
      `Found ${plan.matchedKeywords.length} matching keywords in your resume.`,
      ...plan.risks || [],
      "Consider quantifying your achievements with specific metrics.",
      "Ensure your resume uses standard section headings for better ATS compatibility."
    ]
  };
  
  const atsDocx = await renderAtsDocx(dir, atsScore);
  
  // Step 5: Convert DOCX to PDF
  let resumePdf = resumeDocx.replace(/\.docx$/i, '.pdf');
  let coverPdf = coverDocx.replace(/\.docx$/i, '.pdf');
  let atsPdf = atsDocx.replace(/\.docx$/i, '.pdf');
  
  if (libreOfficeInstalled) {
    logger.info('Converting DOCX files to PDF');
    try {
      resumePdf = await docxToPdf(resumeDocx);
      coverPdf = await docxToPdf(coverDocx);
      atsPdf = await docxToPdf(atsDocx);
    } catch (error) {
      logger.error('Error converting DOCX to PDF', { error });
      // Continue with the DOCX files
    }
  } else {
    logger.warn('LibreOffice not installed, skipping PDF conversion');
  }
  
  logger.info('Tailoring pipeline complete');
  
  return {
    resumePdf,
    coverPdf,
    atsPdf,
    resumeDocx,
    coverDocx,
    atsDocx,
    libreOfficeInstalled
  };
}
