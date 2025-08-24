import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-extract');

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName?: string;
  fontWeight?: string;
  page: number;
}

/**
 * Dynamically imports PDF.js in a way that works in both browser and Node.js environments
 */
async function getPdfJs() {
  try {
    if (typeof window === 'undefined') {
      // Server-side
      try {
        // Try the standard import first
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configure the worker
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          try {
            // Try to resolve the worker path
            const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
          } catch (workerError) {
            logger.warn('Could not resolve standard worker path, trying legacy', { error: workerError });
            
            try {
              // Try legacy path as fallback
              const legacyWorkerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
              pdfjsLib.GlobalWorkerOptions.workerSrc = legacyWorkerPath;
            } catch (legacyError) {
              logger.error('Failed to resolve any worker path', { error: legacyError });
              // Continue without worker, which may still work for basic extraction
            }
          }
        }
        
        return pdfjsLib;
      } catch (serverError) {
        logger.error('Error importing pdfjs-dist on server', { error: serverError });
        throw serverError;
      }
    } else {
      // Client-side
      try {
        const pdfjsLib = await import('pdfjs-dist');
        
        // Configure the worker
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          // Use CDN for client-side
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
        
        return pdfjsLib;
      } catch (clientError) {
        logger.error('Error importing pdfjs-dist on client', { error: clientError });
        throw clientError;
      }
    }
  } catch (error) {
    logger.error('Failed to initialize PDF.js', { error });
    throw new Error('Failed to initialize PDF.js: ' + error);
  }
}

/**
 * Extracts text blocks from a PDF buffer
 * Each text block contains the text content along with position and font information
 */
export async function extractPdfText(pdfBuffer: Buffer): Promise<TextBlock[]> {
  logger.info('Extracting text from PDF', { bufferSize: pdfBuffer.length });
  
  try {
    const pdfjsLib = await getPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDocument = await loadingTask.promise;
    const textBlocks: TextBlock[] = [];
    
    logger.info('PDF loaded successfully', { numPages: pdfDocument.numPages });
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      logger.info(`Processing page ${pageNum}/${pdfDocument.numPages}`);
      
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        
        // Process each text item
        for (const item of textContent.items) {
          const textItem = item as any; // Cast to any since we don't have the exact type
          
          // Skip empty text
          if (!textItem.str.trim()) continue;
          
          // Extract position and size
          const transform = textItem.transform;
          const x = transform[4];
          const y = viewport.height - transform[5]; // Flip Y coordinate
          const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
          const width = textItem.width || (textItem.str.length * fontSize * 0.6); // Estimate width if not provided
          const height = fontSize * 1.2; // Estimate height
          
          // Extract font information
          const fontName = textItem.fontName || '';
          const isBold = /bold|heavy|black/i.test(fontName);
          
          textBlocks.push({
            text: textItem.str,
            x,
            y,
            width,
            height,
            fontSize,
            fontName,
            fontWeight: isBold ? 'bold' : 'normal',
            page: pageNum - 1 // 0-indexed page number
          });
        }
      } catch (pageError) {
        logger.error(`Error processing page ${pageNum}`, { error: pageError });
        // Continue with other pages
      }
    }
    
    logger.info('PDF text extraction complete', { 
      extractedBlocks: textBlocks.length,
      pages: pdfDocument.numPages
    });
    
    return textBlocks;
  } catch (error) {
    logger.error('Error extracting text from PDF', { error });
    throw new Error('Failed to extract text from PDF: ' + error);
  }
}

/**
 * Checks if a PDF is likely scanned (image-based) by analyzing the text extraction results
 */
export function isLikelyScannedPdf(textBlocks: TextBlock[]): boolean {
  // A PDF is likely scanned if it has very few text blocks
  if (textBlocks.length < 10) {
    return true;
  }
  
  // Calculate text density (average characters per block)
  const totalChars = textBlocks.reduce((sum, block) => sum + block.text.length, 0);
  const avgCharsPerBlock = totalChars / textBlocks.length;
  
  // Scanned PDFs converted with OCR often have very short text blocks
  if (avgCharsPerBlock < 3) {
    return true;
  }
  
  // Check for common OCR artifacts (single character blocks)
  const singleCharBlocks = textBlocks.filter(block => block.text.length === 1);
  if (singleCharBlocks.length > textBlocks.length * 0.5) {
    return true;
  }
  
  return false;
}
