import { TextItem } from './types';

// We'll use a more robust approach to handle PDF.js in both environments
let pdfjs: any;

// This function ensures PDF.js is properly initialized in any environment
async function getPdfJs() {
  if (pdfjs) return pdfjs;
  
  try {
    if (typeof window === 'undefined') {
      // Server-side
      // Use require instead of import for server-side
      const pdfjsLib = require('pdfjs-dist');
      
      // Configure the worker
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        try {
          const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.js');
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
        } catch (workerError) {
          console.warn('Could not resolve pdf.worker.js, trying alternative paths', workerError);
          // Try alternative paths
          try {
            const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
          } catch (legacyWorkerError) {
            console.error('Failed to resolve pdf.worker.js', legacyWorkerError);
            // Continue without setting worker
          }
        }
      }
      
      pdfjs = pdfjsLib;
    } else {
      // Client-side
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configure the worker
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
      
      pdfjs = pdfjsLib;
    }
  } catch (error) {
    console.error('Error initializing PDF.js:', error);
    // Fallback to empty implementation
    pdfjs = {
      getDocument: () => ({
        promise: Promise.resolve({
          numPages: 0,
          getPage: () => ({
            getViewport: () => ({ width: 0, height: 0 }),
            getTextContent: () => ({ items: [] })
          })
        })
      })
    };
  }
  
  return pdfjs;
}

/**
 * Extract text items from a PDF
 * @param pdfBytes PDF file as Uint8Array
 * @returns Array of TextItems
 */
export async function extractTextItems(pdfBytes: Uint8Array): Promise<TextItem[]> {
  try {
    // Get PDF.js instance
    const pdfjsLib = await getPdfJs();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdfDocument = await loadingTask.promise;
    
    const textItems: TextItem[] = [];
    const pageCount = pdfDocument.numPages;

    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      // Process each text item
      for (const item of textContent.items) {
        const textItem = item as any; // Cast to any since we don't have the pdfjs types directly
        
        // Skip empty items
        if (!textItem.str.trim()) continue;
        
        // Get the transform and calculate position
        const transform = textItem.transform;
        const x = transform[4];
        const y = viewport.height - transform[5]; // Convert PDF coordinates to top-left origin
        
        // Calculate font size from the transform matrix
        const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
        
        // Calculate width and height
        const width = textItem.width || (textItem.str.length * fontSize * 0.6); // Estimate if not provided
        const height = fontSize * 1.2; // Estimate height based on font size
        
        // Calculate caps ratio
        const capsRatio = textItem.str.replace(/[^A-Z]/g, '').length / textItem.str.length;
        
        // Guess if bold based on font name
        const fontName = textItem.fontName || '';
        const boldGuess = /bold|heavy|black/i.test(fontName);
        
        textItems.push({
          page: pageNum - 1, // 0-indexed
          text: textItem.str,
          x,
          y,
          w: width,
          h: height,
          fontSize,
          fontName,
          boldGuess,
          capsRatio
        });
      }
    }
    
    return textItems;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return [];
  }
}

/**
 * Check if a PDF is likely scanned (image-based)
 * @param textItems Extracted text items
 * @param pageCount Number of pages in the PDF
 * @returns True if the PDF is likely scanned
 */
export function isLikelyScannedPdf(textItems: TextItem[], pageCount: number): boolean {
  // If there are no text items, it's definitely scanned
  if (textItems.length === 0) return true;
  
  // Calculate average text items per page
  const avgItemsPerPage = textItems.length / pageCount;
  
  // If there are very few text items per page, it might be scanned
  if (avgItemsPerPage < 10) return true;
  
  // Check if there are text items on each page
  const pagesWithText = new Set(textItems.map(item => item.page)).size;
  if (pagesWithText < pageCount * 0.5) return true;
  
  return false;
}
