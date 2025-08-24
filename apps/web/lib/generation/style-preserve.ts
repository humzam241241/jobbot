import path from "node:path";
import fs from "node:fs/promises";
import { analyzePdfToManifest } from "../style/pdf-style-analyzer";
import { analyzeDocxToManifest } from "../style/docx-style-analyzer";
import { resumeTemplate } from "../render/templates/resume.param.template";
import { coverTemplate } from "../render/templates/cover.param.template";
import { atsTemplate } from "../render/templates/ats.param.template";
import { htmlToPdf } from "../render/puppeteer";
import mime from "mime";
import { debugLogger } from "../utils/debug-logger";

export async function renderWithStylePreserve(
  kitId: string, 
  inputPath: string, 
  tailored: any, 
  jobDescription: string, 
  ats: any
) {
  const logger = (message: string, data?: any) => {
    debugLogger.debug(message, { component: 'StylePreserve', kitId, data });
  };

  try {
    logger('Starting style-preserving rendering', { inputPath });
    
    // Ensure output directory exists
    const dir = path.join(process.cwd(), "public/kits", kitId);
    await fs.mkdir(dir, { recursive: true });
    
    // Determine file type and analyze style
    const type = mime.getType(inputPath) || "";
    const isDocx = /\.docx$/i.test(inputPath) || type.includes("officedocument");
    
    logger('Analyzing document style', { isDocx, type });
    
    const manifest = isDocx
      ? await analyzeDocxToManifest(inputPath)
      : await analyzePdfToManifest(inputPath);
    
    logger('Style manifest generated', { manifest });
    
    // Generate HTML from templates
    const resumeHtml = resumeTemplate(manifest, tailored);
    const coverHtml = coverTemplate(manifest, tailored, jobDescription);
    const atsHtml = atsTemplate(manifest, ats);
    
    logger('HTML templates generated');
    
    // Define output paths
    const resumeOut = path.join(dir, "resume.pdf");
    const coverOut = path.join(dir, "cover-letter.pdf");
    const atsOut = path.join(dir, "ats.pdf");
    
    // Convert HTML to PDF
    logger('Converting resume to PDF');
    await htmlToPdf(resumeHtml, resumeOut);
    
    logger('Converting cover letter to PDF');
    await htmlToPdf(coverHtml, coverOut);
    
    logger('Converting ATS report to PDF');
    await htmlToPdf(atsHtml, atsOut);
    
    // Verify files exist and have content
    const fileStats = await Promise.all([
      fs.stat(resumeOut),
      fs.stat(coverOut),
      fs.stat(atsOut)
    ]);
    
    const allFilesValid = fileStats.every(stat => stat.size > 0);
    if (!allFilesValid) {
      throw new Error('Generated files validation failed');
    }
    
    logger('Style-preserving rendering completed successfully');
    
    // Return the file paths
    return {
      resumeUrl: `/kits/${kitId}/resume.pdf`,
      coverLetterUrl: `/kits/${kitId}/cover-letter.pdf`,
      atsReportUrl: `/kits/${kitId}/ats.pdf`
    };
  } catch (error) {
    logger('Error in style-preserving rendering', { error });
    throw error;
  }
}
