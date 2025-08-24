import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import { drawTextInBox, drawBullets } from './draw';
import { Rect } from '../analyzer/types';

/**
 * Content that couldn't fit on the original pages
 */
export interface OverflowContent {
  profile?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company?: string;
    location?: string;
    dates?: string;
    bullets: string[];
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    dates?: string;
    details?: string[];
  }>;
  other?: Record<string, any>;
}

/**
 * Add an overflow page to handle content that didn't fit
 * @param pdfDoc PDF document
 * @param overflowContent Content that didn't fit on original pages
 * @param regularFont Regular font
 * @param boldFont Bold font
 * @returns The new page
 */
export async function addOverflowPage(
  pdfDoc: PDFDocument,
  overflowContent: OverflowContent,
  regularFont: PDFFont,
  boldFont: PDFFont
): Promise<PDFPage> {
  // Create a new page
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  
  // Set margins
  const margin = 72; // 1 inch margins
  const contentWidth = width - 2 * margin;
  
  // Start position
  let y = height - margin;
  
  // Add title
  page.drawText('Additional Information', {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  y -= 30; // Space after title
  
  // Add profile section if there's overflow
  if (overflowContent.profile) {
    y -= 10;
    page.drawText('Profile', {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    y -= 20;
    
    const { usedHeight } = await drawTextInBox(
      page,
      overflowContent.profile,
      { x: margin, y, w: contentWidth, h: 200, page: 0 },
      regularFont,
      11,
      1.25,
      'left'
    );
    
    y -= usedHeight + 20;
  }
  
  // Add skills section if there's overflow
  if (overflowContent.skills && overflowContent.skills.length > 0) {
    y -= 10;
    page.drawText('Skills', {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    y -= 20;
    
    // Draw skills as a comma-separated list
    const skillsText = overflowContent.skills.join(', ');
    const { usedHeight } = await drawTextInBox(
      page,
      skillsText,
      { x: margin, y, w: contentWidth, h: 200, page: 0 },
      regularFont,
      11,
      1.25,
      'left'
    );
    
    y -= usedHeight + 20;
  }
  
  // Add experience section if there's overflow
  if (overflowContent.experience && overflowContent.experience.length > 0) {
    y -= 10;
    page.drawText('Experience', {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    y -= 20;
    
    for (const exp of overflowContent.experience) {
      // Draw title and company
      const titleText = exp.company 
        ? `${exp.title} - ${exp.company}` 
        : exp.title;
      
      page.drawText(titleText, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      // Draw location and dates if available
      if (exp.location || exp.dates) {
        const locationDates = [exp.location, exp.dates].filter(Boolean).join(' | ');
        
        page.drawText(locationDates, {
          x: margin,
          y,
          size: 11,
          font: regularFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
      }
      
      // Draw bullets
      if (exp.bullets && exp.bullets.length > 0) {
        const { usedHeight } = await drawBullets(
          page,
          exp.bullets,
          { x: margin + 15, y, w: contentWidth - 15, h: 200, page: 0 },
          regularFont,
          11,
          1.25,
          '•'
        );
        
        y -= usedHeight + 15;
      }
    }
  }
  
  // Add education section if there's overflow
  if (overflowContent.education && overflowContent.education.length > 0) {
    y -= 10;
    page.drawText('Education', {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });
    
    y -= 20;
    
    for (const edu of overflowContent.education) {
      // Draw school and degree
      const schoolDegree = edu.degree 
        ? `${edu.school} - ${edu.degree}` 
        : edu.school;
      
      page.drawText(schoolDegree, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      // Draw dates if available
      if (edu.dates) {
        page.drawText(edu.dates, {
          x: margin,
          y,
          size: 11,
          font: regularFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
      }
      
      // Draw details as bullets if available
      if (edu.details && edu.details.length > 0) {
        const { usedHeight } = await drawBullets(
          page,
          edu.details,
          { x: margin + 15, y, w: contentWidth - 15, h: 200, page: 0 },
          regularFont,
          11,
          1.25,
          '•'
        );
        
        y -= usedHeight + 15;
      }
    }
  }
  
  // Add other sections if there's overflow
  if (overflowContent.other) {
    for (const [sectionTitle, content] of Object.entries(overflowContent.other)) {
      y -= 10;
      page.drawText(sectionTitle, {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      // Handle different content types
      if (typeof content === 'string') {
        const { usedHeight } = await drawTextInBox(
          page,
          content,
          { x: margin, y, w: contentWidth, h: 200, page: 0 },
          regularFont,
          11,
          1.25,
          'left'
        );
        
        y -= usedHeight + 15;
      } else if (Array.isArray(content)) {
        const { usedHeight } = await drawBullets(
          page,
          content.map(item => item.toString()),
          { x: margin + 15, y, w: contentWidth - 15, h: 200, page: 0 },
          regularFont,
          11,
          1.25,
          '•'
        );
        
        y -= usedHeight + 15;
      }
    }
  }
  
  return page;
}
