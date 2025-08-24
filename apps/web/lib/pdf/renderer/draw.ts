import { PDFDocument, PDFPage, PDFFont, rgb, degrees } from 'pdf-lib';
import { Rect } from '../analyzer/types';

/**
 * Draw text in a box with word wrapping
 * @param page PDF page
 * @param text Text to draw
 * @param rect Rectangle to draw in
 * @param font Font to use
 * @param fontSize Font size
 * @param lineHeight Line height as multiple of font size
 * @param align Text alignment ('left', 'center', or 'right')
 * @returns Object with used height and overflow text
 */
export async function drawTextInBox(
  page: PDFPage,
  text: string,
  rect: Rect,
  font: PDFFont,
  fontSize: number = 11,
  lineHeight: number = 1.25,
  align: 'left' | 'center' | 'right' = 'left'
): Promise<{ usedHeight: number; overflowText?: string }> {
  if (!text || text.trim().length === 0) {
    return { usedHeight: 0 };
  }
  
  const lineSpacing = fontSize * lineHeight;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';
  
  // Word wrap
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= rect.w) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long for the line, need to split it
        lines.push(word);
        currentLine = '';
      }
    }
  }
  
  // Add the last line if there's anything left
  if (currentLine) {
    lines.push(currentLine);
  }
  
  // Calculate how many lines will fit
  const maxLines = Math.floor(rect.h / lineSpacing);
  const fittingLines = lines.slice(0, maxLines);
  const overflowLines = lines.slice(maxLines);
  
  // Draw the fitting lines
  let y = rect.y;
  for (const line of fittingLines) {
    let x = rect.x;
    
    if (align === 'center') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      x = rect.x + (rect.w - lineWidth) / 2;
    } else if (align === 'right') {
      const lineWidth = font.widthOfTextAtSize(line, fontSize);
      x = rect.x + rect.w - lineWidth;
    }
    
    page.drawText(line, {
      x,
      y: y + lineSpacing - fontSize, // Adjust y to align with baseline
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
    
    y += lineSpacing;
  }
  
  return {
    usedHeight: fittingLines.length * lineSpacing,
    overflowText: overflowLines.length > 0 ? overflowLines.join(' ') : undefined
  };
}

/**
 * Draw bullet points with hanging indent
 * @param page PDF page
 * @param bullets Array of bullet point texts
 * @param rect Rectangle to draw in
 * @param font Font to use
 * @param fontSize Font size
 * @param lineHeight Line height as multiple of font size
 * @param bulletChar Bullet character
 * @returns Object with used height and overflow bullets
 */
export async function drawBullets(
  page: PDFPage,
  bullets: string[],
  rect: Rect,
  font: PDFFont,
  fontSize: number = 11,
  lineHeight: number = 1.25,
  bulletChar: string = '•'
): Promise<{ usedHeight: number; overflowBullets?: string[] }> {
  if (!bullets || bullets.length === 0) {
    return { usedHeight: 0 };
  }
  
  const lineSpacing = fontSize * lineHeight;
  const bulletWidth = font.widthOfTextAtSize(bulletChar + ' ', fontSize);
  const indentedRect = {
    ...rect,
    x: rect.x + bulletWidth,
    w: rect.w - bulletWidth
  };
  
  let totalUsedHeight = 0;
  const overflowBullets: string[] = [];
  
  for (const bullet of bullets) {
    // Draw the bullet character
    page.drawText(bulletChar, {
      x: rect.x,
      y: rect.y + totalUsedHeight + lineSpacing - fontSize, // Adjust y to align with baseline
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    });
    
    // Draw the bullet text with word wrap
    const { usedHeight, overflowText } = await drawTextInBox(
      page,
      bullet,
      {
        ...indentedRect,
        y: rect.y + totalUsedHeight
      },
      font,
      fontSize,
      lineHeight,
      'left'
    );
    
    totalUsedHeight += usedHeight;
    
    // Check if we've run out of space
    if (totalUsedHeight > rect.h) {
      // Add this bullet to overflow if it didn't fully fit
      if (overflowText) {
        overflowBullets.push(overflowText);
      }
      
      // Add remaining bullets to overflow
      overflowBullets.push(...bullets.slice(bullets.indexOf(bullet) + 1));
      break;
    } else if (overflowText) {
      // If there was overflow text but we still have space, add it as a new bullet
      overflowBullets.push(overflowText);
    }
  }
  
  return {
    usedHeight: Math.min(totalUsedHeight, rect.h),
    overflowBullets: overflowBullets.length > 0 ? overflowBullets : undefined
  };
}

/**
 * Draw a white rectangle to cover existing content
 * @param page PDF page
 * @param rect Rectangle to cover
 */
export function whiteoutRect(page: PDFPage, rect: Rect): void {
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    color: rgb(1, 1, 1), // White
    opacity: 1
  });
}

/**
 * Draw a debug rectangle around a region
 * @param page PDF page
 * @param rect Rectangle to outline
 * @param color RGB color values (0-1)
 */
export function drawDebugRect(
  page: PDFPage,
  rect: Rect,
  color: { r: number; g: number; b: number } = { r: 1, g: 0, b: 0 }
): void {
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    borderColor: rgb(color.r, color.g, color.b),
    borderWidth: 1,
    opacity: 0.5
  });
}
