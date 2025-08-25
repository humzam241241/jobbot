import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { SectionMap, Section, Block, Rect } from '../analyzer/types';

/**
 * Create debug overlay images showing detected sections
 * @param pdfBytes PDF file as Uint8Array
 * @param sectionMap Map of detected sections
 * @returns Path to the debug directory
 */
export async function createDebugOverlay(
  pdfBytes: Uint8Array,
  sectionMap: SectionMap
): Promise<string> {
  // Create debug directory
  const debugDir = path.join(process.cwd(), 'apps/web/debug/last');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  // Save section map as JSON
  const coordsPath = path.join(debugDir, 'coords.json');
  fs.writeFileSync(coordsPath, JSON.stringify(sectionMap, null, 2));
  
  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pageCount = pdfDoc.getPageCount();
  
  // Create debug overlay for each page
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    
    // Create a canvas for the page
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw page background (white)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw sections
    const pageSections = sectionMap.sections.filter(section => section.page === i);
    for (const section of pageSections) {
      drawDebugSection(ctx, section);
    }
    
    // Save the canvas as a PNG
    const pngPath = path.join(debugDir, `page-${i + 1}.png`);
    const pngBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(pngPath, pngBuffer);
  }
  
  // Create a debug PDF with section outlines
  const debugPdfDoc = await PDFDocument.load(pdfBytes);
  
  for (let i = 0; i < pageCount; i++) {
    const page = debugPdfDoc.getPage(i);
    
    // Draw section outlines
    const pageSections = sectionMap.sections.filter(section => section.page === i);
    for (const section of pageSections) {
      // Draw section rectangle
      page.drawRectangle({
        x: section.rect.x,
        y: section.rect.y,
        width: section.rect.w,
        height: section.rect.h,
        borderColor: rgb(1, 0, 0), // Red
        borderWidth: 2,
        opacity: 0.5
      });
      
      // Draw section label
      page.drawText(section.label, {
        x: section.rect.x + 5,
        y: section.rect.y + section.rect.h - 15,
        size: 12,
        color: rgb(1, 0, 0) // Red
      });
      
      // Draw blocks
      for (const block of section.blocks) {
        page.drawRectangle({
          x: block.rect.x,
          y: block.rect.y,
          width: block.rect.w,
          height: block.rect.h,
          borderColor: rgb(0, 0, 1), // Blue
          borderWidth: 1,
          opacity: 0.3
        });
      }
    }
  }
  
  // Save the debug PDF
  const debugPdfBytes = await debugPdfDoc.save();
  const debugPdfPath = path.join(debugDir, 'debug.pdf');
  fs.writeFileSync(debugPdfPath, debugPdfBytes);
  
  return debugDir;
}

/**
 * Draw a section on the debug canvas
 * @param ctx Canvas context
 * @param section Section to draw
 */
function drawDebugSection(ctx: any, section: Section): void {
  // Draw section rectangle
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(section.rect.x, section.rect.y, section.rect.w, section.rect.h);
  
  // Draw section label
  ctx.fillStyle = 'red';
  ctx.font = '12px Arial';
  ctx.fillText(section.label, section.rect.x + 5, section.rect.y + 15);
  
  // Draw confidence level
  ctx.fillText(`Confidence: ${section.confidence.toFixed(2)}`, section.rect.x + 5, section.rect.y + 30);
  
  // Draw blocks
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 1;
  for (const block of section.blocks) {
    ctx.strokeRect(block.rect.x, block.rect.y, block.rect.w, block.rect.h);
  }
}

/**
 * Save a debug message to a log file
 * @param message Debug message
 * @param data Additional data to log
 */
export function logDebug(message: string, data?: any): void {
  const debugDir = path.join(process.cwd(), 'apps/web/debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  const logPath = path.join(debugDir, 'debug.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}`;
  
  fs.appendFileSync(logPath, logEntry);
}
