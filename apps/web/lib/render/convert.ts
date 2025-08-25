import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { createLogger } from '@/lib/logger';

const logger = createLogger('docx-to-pdf');
const exec = promisify(execFile);

/**
 * Converts a DOCX file to PDF using LibreOffice
 * @param docxPath Path to the DOCX file
 * @returns Path to the generated PDF file
 */
export async function docxToPdf(docxPath: string): Promise<string> {
  try {
    const outDir = path.dirname(docxPath);
    
    logger.info(`Converting ${docxPath} to PDF`);
    
    await exec("soffice", [
      "--headless",
      "--nolockcheck",
      "--norestore",
      "--convert-to", "pdf:writer_pdf_Export",
      "--outdir", outDir,
      docxPath
    ], { timeout: 60_000 });
    
    const pdfPath = docxPath.replace(/\.docx$/i, ".pdf");
    
    // Verify the PDF was created
    try {
      await fs.access(pdfPath);
      logger.info(`PDF created successfully: ${pdfPath}`);
      return pdfPath;
    } catch (accessError) {
      throw new Error(`PDF file not found after conversion: ${pdfPath}`);
    }
  } catch (e: any) {
    logger.error('PDF conversion failed', { error: e });
    
    // Check if LibreOffice is installed
    try {
      await exec("soffice", ["--version"]);
      throw new Error(`PDF conversion failed: ${e.message}`);
    } catch (versionError) {
      throw new Error("PDF conversion failed. Please ensure LibreOffice is installed and 'soffice' is on PATH.");
    }
  }
}

/**
 * Checks if LibreOffice is installed and available
 * @returns True if LibreOffice is installed, false otherwise
 */
export async function isLibreOfficeInstalled(): Promise<boolean> {
  try {
    await exec("soffice", ["--version"]);
    return true;
  } catch (error) {
    return false;
  }
}
