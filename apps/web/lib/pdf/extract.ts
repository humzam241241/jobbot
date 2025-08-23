import pdfParse from "pdf-parse";
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-extract');

interface ExtractResult {
  pages: number;
  text: string;
}

export async function extractTextFromPdf(file: Buffer): Promise<ExtractResult> {
  try {
    logger.info('Extracting text from PDF');
    
    const data = await pdfParse(file, { pagerender: undefined });
    const text = (data?.text || "").replace(/\r/g, "").trim();
    
    logger.info('PDF text extraction complete', {
      pages: data?.numpages || 0,
      textLength: text.length
    });
    
    return { 
      pages: data?.numpages || 0, 
      text 
    };
  } catch (error) {
    logger.error('Error extracting text from PDF', { error });
    throw error;
  }
}