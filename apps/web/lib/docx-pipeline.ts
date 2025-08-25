/**
 * Simplified DOCX pipeline that works with minimal dependencies
 */

import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

// Create a simple logger if the imported one isn't available
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || '')
};

/**
 * Extract text from a DOCX file
 */
export async function extractTextFromDocx(docxPath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(docxPath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error('Error extracting text from DOCX', { error });
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

/**
 * Generate a tailored resume DOCX file
 */
export async function generateTailoredDocx(
  outputPath: string,
  originalText: string,
  jobDescription: string
): Promise<string> {
  try {
    // Create a simple document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Tailored Resume",
              heading: HeadingLevel.HEADING_1,
              alignment: 'center'
            }),
            new Paragraph({
              text: "Original Content",
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              text: originalText.substring(0, 500) + (originalText.length > 500 ? '...' : '')
            }),
            new Paragraph({
              text: "Job Description",
              heading: HeadingLevel.HEADING_2
            }),
            new Paragraph({
              text: jobDescription.substring(0, 500) + (jobDescription.length > 500 ? '...' : '')
            }),
            new Paragraph({
              text: "This is a placeholder for the tailored resume content. In a real implementation, this would contain content tailored to the job description using an LLM."
            })
          ]
        }
      ]
    });

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Save the document
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    return outputPath;
  } catch (error) {
    logger.error('Error generating tailored DOCX', { error });
    throw new Error(`Failed to generate tailored DOCX: ${error}`);
  }
}

/**
 * Main pipeline function
 */
export async function runSimplifiedPipeline(
  inputDocxPath: string,
  outputDir: string,
  jobDescription: string
): Promise<{ docxPath: string }> {
  try {
    logger.info('Running simplified DOCX pipeline');
    
    // Extract text from DOCX
    logger.info('Extracting text from DOCX');
    const text = await extractTextFromDocx(inputDocxPath);
    
    // Generate tailored DOCX
    logger.info('Generating tailored DOCX');
    const outputPath = path.join(outputDir, 'tailored.docx');
    await generateTailoredDocx(outputPath, text, jobDescription);
    
    logger.info('Pipeline completed successfully');
    return { docxPath: outputPath };
  } catch (error) {
    logger.error('Pipeline failed', { error });
    throw error;
  }
}