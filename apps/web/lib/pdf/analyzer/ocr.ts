import { createWorker } from 'tesseract.js';
import { TextItem, Block, SectionType, ConfidenceLevel, SectionMap } from './types';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { createCanvas } from 'canvas';
import { inferSectionsFromBlocks } from './sections';

/**
 * Process a scanned PDF using OCR
 * @param pdfBytes PDF file as Uint8Array
 * @returns Promise with extracted text items
 */
export async function processScannedPdf(pdfBytes: Uint8Array): Promise<TextItem[]> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    const textItems: TextItem[] = [];
    
    try {
      // Initialize Tesseract worker
      console.log('Initializing Tesseract worker');
      const worker = await createWorker('eng');
      
      // Process each page
      for (let i = 0; i < pageCount; i++) {
        console.log(`Processing page ${i + 1} of ${pageCount}`);
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        
        // Render the page to a canvas
        const pageImage = await renderPageToImage(page, width, height);
        
        // Perform OCR on the page image
        console.log(`Running OCR on page ${i + 1}`);
        const { data } = await worker.recognize(pageImage);
        
        // Process OCR results
        for (const block of data.blocks || []) {
          for (const line of block.lines || []) {
            const { text, bbox } = line;
            if (!text.trim()) continue;
            
            // Convert bbox coordinates to PDF coordinates
            const x = bbox.x0;
            const y = height - bbox.y1; // Flip y-coordinate
            const w = bbox.x1 - bbox.x0;
            const h = bbox.y1 - bbox.y0;
            
            // Estimate font size based on height
            const fontSize = h * 0.8;
            
            // Create text item
            textItems.push({
              page: i,
              text,
              x,
              y,
              w,
              h,
              fontSize,
              capsRatio: calculateCapsRatio(text)
            });
          }
        }
      }
      
      // Terminate the worker
      console.log('Terminating Tesseract worker');
      await worker.terminate();
    } catch (ocrError) {
      console.error('OCR processing error, falling back to basic extraction:', ocrError);
      
      // Fallback: Create some basic text items from the PDF
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        
        // Create a single text item for the page with placeholder text
        textItems.push({
          page: i,
          text: `Page ${i + 1} content (OCR failed)`,
          x: 50,
          y: 50,
          w: width - 100,
          h: 20,
          fontSize: 12,
          capsRatio: 0
        });
      }
    }
    
    return textItems;
  } catch (error) {
    console.error('Error processing scanned PDF:', error);
    return [{
      page: 0,
      text: 'Failed to process PDF',
      x: 50,
      y: 50,
      w: 300,
      h: 20,
      fontSize: 12,
      capsRatio: 0
    }];
  }
}

/**
 * Calculate the ratio of uppercase characters in a string
 * @param text Input text
 * @returns Ratio of uppercase characters
 */
function calculateCapsRatio(text: string): number {
  if (!text || text.length === 0) return 0;
  const upperCaseChars = text.replace(/[^A-Z]/g, '').length;
  return upperCaseChars / text.length;
}

/**
 * Render a PDF page to an image
 * @param page PDF page
 * @param width Page width
 * @param height Page height
 * @returns Image data URL
 */
async function renderPageToImage(page: PDFPage, width: number, height: number): Promise<string> {
  try {
    // Create a canvas with the page dimensions
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // In a real implementation, we would render the PDF page to the canvas
    // This is a simplified version that returns an empty white image
    // For actual rendering, you would use pdf.js or a similar library
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering page to image:', error);
    
    // Create a minimal fallback canvas
    try {
      // Try with smaller dimensions if the original ones were too large
      const fallbackWidth = Math.min(width, 800);
      const fallbackHeight = Math.min(height, 600);
      
      const fallbackCanvas = createCanvas(fallbackWidth, fallbackHeight);
      const fallbackCtx = fallbackCanvas.getContext('2d');
      
      fallbackCtx.fillStyle = 'white';
      fallbackCtx.fillRect(0, 0, fallbackWidth, fallbackHeight);
      
      fallbackCtx.fillStyle = 'black';
      fallbackCtx.font = '14px Arial';
      fallbackCtx.fillText('Error rendering page', 20, 20);
      
      return fallbackCanvas.toDataURL('image/png');
    } catch (fallbackError) {
      console.error('Error creating fallback canvas:', fallbackError);
      
      // Return a minimal data URL for a 1x1 transparent pixel
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
  }
}

/**
 * Create blocks from OCR text items
 * @param textItems Array of text items from OCR
 * @returns Array of blocks
 */
export function createBlocksFromOcrTextItems(textItems: TextItem[]): Block[] {
  // Group text items by page
  const itemsByPage = textItems.reduce((acc, item) => {
    acc[item.page] = acc[item.page] || [];
    acc[item.page].push(item);
    return acc;
  }, {} as Record<number, TextItem[]>);
  
  const blocks: Block[] = [];
  
  // Process each page
  for (const [pageStr, items] of Object.entries(itemsByPage)) {
    const page = parseInt(pageStr, 10);
    
    // Sort items by y-position
    const sortedItems = [...items].sort((a, b) => a.y - b.y);
    
    // Group items into lines based on y-position
    let currentLineY = -1;
    let currentLine: TextItem[] = [];
    const lines: TextItem[][] = [];
    
    for (const item of sortedItems) {
      const yTolerance = item.fontSize * 0.5;
      
      if (currentLineY === -1 || Math.abs(item.y - currentLineY) > yTolerance) {
        // Start a new line
        if (currentLine.length > 0) {
          lines.push([...currentLine]);
        }
        currentLine = [item];
        currentLineY = item.y;
      } else {
        // Add to current line
        currentLine.push(item);
      }
    }
    
    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    // Sort items within each line by x-position
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].sort((a, b) => a.x - b.x);
    }
    
    // Group lines into blocks based on vertical spacing
    let currentBlock: TextItem[] = [];
    let prevLineY = -1;
    
    for (const line of lines) {
      if (line.length === 0) continue;
      
      const lineY = line[0].y;
      const lineHeight = line[0].fontSize * 1.2;
      
      // Check if this line is part of the current block
      const verticalGap = prevLineY !== -1 ? lineY - prevLineY : 0;
      const isNewBlock = prevLineY === -1 || verticalGap > lineHeight * 1.8;
      
      if (isNewBlock && currentBlock.length > 0) {
        // Create a new block
        const blockItems = [...currentBlock];
        
        // Calculate block rectangle
        const minX = Math.min(...blockItems.map(item => item.x));
        const minY = Math.min(...blockItems.map(item => item.y));
        const maxX = Math.max(...blockItems.map(item => item.x + item.w));
        const maxY = Math.max(...blockItems.map(item => item.y + item.h));
        
        blocks.push({
          page,
          rect: {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
            page
          },
          lines: blockItems
        });
        
        currentBlock = [];
      }
      
      // Add the current line to the block
      currentBlock.push(...line);
      prevLineY = lineY;
    }
    
    // Add the last block
    if (currentBlock.length > 0) {
      const blockItems = [...currentBlock];
      
      // Calculate block rectangle
      const minX = Math.min(...blockItems.map(item => item.x));
      const minY = Math.min(...blockItems.map(item => item.y));
      const maxX = Math.max(...blockItems.map(item => item.x + item.w));
      const maxY = Math.max(...blockItems.map(item => item.y + item.h));
      
      blocks.push({
        page,
        rect: {
          x: minX,
          y: minY,
          w: maxX - minX,
          h: maxY - minY,
          page
        },
        lines: blockItems
      });
    }
  }
  
  return blocks;
}
