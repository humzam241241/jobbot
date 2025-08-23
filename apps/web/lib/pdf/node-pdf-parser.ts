import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { Canvas, createCanvas } from 'canvas';
import { JSDOM } from 'jsdom';

// Initialize JSDOM for PDF.js
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
(global as any).window = dom.window;
(global as any).navigator = dom.window.navigator;
(global as any).document = dom.window.document;
(global as any).Canvas = Canvas;
(global as any).Image = Canvas.Image;

// Now import PDF.js after setting up the environment
// Import PDF.js with proper Node.js path
import * as pdfjsLib from 'pdfjs-dist';

const logger = createLogger('pdf:node-parser');

// Configure PDF.js for Node environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * A simplified PDF parser that works in Node.js environment
 * This avoids using browser-specific APIs that might not be available in Node
 */
export async function parseNodePdf(pdfBuffer: Buffer | Uint8Array): Promise<{
  pages: number;
  pageSize: { width: number; height: number };
  textItems: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontName: string;
    fontSize: number;
  }>;
}> {
  try {
    // Load the PDF document
    const data = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    logger.info(`PDF loaded with ${pdfDocument.numPages} pages`);
    
    // Get the first page
    const page = await pdfDocument.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Extract page size
    const pageSize = {
      width: viewport.width,
      height: viewport.height
    };
    
    // Extract text content
    const textContent = await page.getTextContent();
    
    // Transform text items into a simpler format
    const textItems = textContent.items.map((item: any) => {
      const transform = item.transform;
      const x = transform[4];
      const y = transform[5];
      const width = item.width || 0;
      const height = item.height || 0;
      const fontName = item.fontName || 'Unknown';
      const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) || 12;
      
      return {
        text: item.str,
        x,
        y: pageSize.height - y, // Convert from PDF coordinates to top-left origin
        width,
        height,
        fontName,
        fontSize
      };
    });
    
    logger.info(`Extracted ${textItems.length} text items from PDF`);
    
    return {
      pages: pdfDocument.numPages,
      pageSize,
      textItems
    };
  } catch (error) {
    logger.error('Error parsing PDF', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from PDF without using browser APIs
 */
export async function extractTextFromNodePdf(pdfBuffer: Buffer | Uint8Array): Promise<string> {
  const { textItems } = await parseNodePdf(pdfBuffer);
  
  // Group text by vertical position to identify lines
  const lineThreshold = 2; // pixels
  const lines: typeof textItems[] = [];
  let currentLine: typeof textItems = [];
  
  // Sort text items by y position (top to bottom)
  const sortedItems = [...textItems].sort((a, b) => a.y - b.y);
  
  let lastY = -1;
  sortedItems.forEach(item => {
    if (lastY === -1 || Math.abs(item.y - lastY) <= lineThreshold) {
      currentLine.push(item);
    } else {
      if (currentLine.length > 0) {
        // Sort items in line by x position (left to right)
        lines.push([...currentLine].sort((a, b) => a.x - b.x));
      }
      currentLine = [item];
    }
    lastY = item.y;
  });
  
  if (currentLine.length > 0) {
    lines.push([...currentLine].sort((a, b) => a.x - b.x));
  }
  
  // Join lines into text
  return lines.map(line => 
    line.map(item => item.text).join(' ')
  ).join('\n');
}