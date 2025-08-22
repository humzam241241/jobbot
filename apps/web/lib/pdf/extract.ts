import pdfParse from 'pdf-parse';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-extract');

/**
 * Extracts text from a PDF buffer
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    logger.info('Extracting text from PDF');
    
    const data = await pdfParse(pdfBuffer, {
      // Preserve as much formatting as possible
      pagerender: renderPage,
    });
    
    logger.info('PDF text extraction complete', { 
      pages: data.numpages,
      textLength: data.text.length 
    });
    
    return data.text;
  } catch (error) {
    logger.error('Error extracting text from PDF', { error });
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Custom page renderer to better preserve formatting
 */
function renderPage(pageData: any) {
  // Check if the page has content
  if (!pageData.getTextContent) {
    return '';
  }
  
  return pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  }).then((textContent: any) => {
    let lastY = -1;
    let text = '';
    
    // Process each text item
    for (const item of textContent.items) {
      // Add newline if y-position changes significantly
      if (lastY !== -1 && Math.abs(lastY - item.transform[5]) > 5) {
        text += '\n';
      }
      
      // Add the text content
      text += item.str;
      
      // Update last y-position
      lastY = item.transform[5];
    }
    
    return text;
  });
}

/**
 * Extracts text from a DOCX buffer
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    logger.info('Extracting text from DOCX');
    
    // This would use a library like mammoth, but for now we'll throw an error
    throw new Error('DOCX extraction not implemented');
  } catch (error) {
    logger.error('Error extracting text from DOCX', { error });
    throw new Error('Failed to extract text from DOCX');
  }
}
