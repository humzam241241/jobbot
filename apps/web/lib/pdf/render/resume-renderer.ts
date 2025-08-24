import { PDFDocument, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { TextBlock } from '../extract/extract-pdf';
import { TailoredResume } from '../tailor/schema';
import { createLogger } from '@/lib/logger';

const logger = createLogger('resume-renderer');

// Font paths
const REGULAR_FONT_PATH = path.join(process.cwd(), 'apps/web/lib/pdf/fonts/Inter-Regular.ttf');
const BOLD_FONT_PATH = path.join(process.cwd(), 'apps/web/lib/pdf/fonts/Inter-Bold.ttf');

/**
 * Renders a tailored resume by modifying the original PDF
 */
export async function renderTailoredResume(
  originalPdfBuffer: Buffer,
  tailoredResume: TailoredResume,
  textBlocks: TextBlock[],
  debug: boolean = false
): Promise<Buffer> {
  logger.info('Rendering tailored resume');
  
  try {
    // Load the original PDF
    const pdfDoc = await PDFDocument.load(originalPdfBuffer);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load fonts
    let regularFont: PDFFont;
    let boldFont: PDFFont;
    
    try {
      // Try to load custom fonts
      const regularFontBytes = fs.readFileSync(REGULAR_FONT_PATH);
      const boldFontBytes = fs.readFileSync(BOLD_FONT_PATH);
      
      regularFont = await pdfDoc.embedFont(regularFontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
      
      logger.info('Custom fonts loaded successfully');
    } catch (fontError) {
      logger.warn('Failed to load custom fonts, using standard fonts', { error: fontError });
      
      // Fall back to standard fonts
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
    
    // Detect sections in the original PDF
    const sections = detectSections(textBlocks);
    logger.info('Sections detected', { sectionCount: sections.length });
    
    // Render each section
    for (const section of sections) {
      const page = pdfDoc.getPage(section.page);
      
      // Whiteout the section area
      page.drawRectangle({
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
        color: rgb(1, 1, 1), // White
      });
      
      // Draw debug box if enabled
      if (debug) {
        page.drawRectangle({
          x: section.x,
          y: section.y,
          width: section.width,
          height: section.height,
          borderColor: rgb(1, 0, 0), // Red
          borderWidth: 1,
          opacity: 0.5,
        });
      }
      
      // Render content based on section type
      switch (section.type) {
        case 'contact':
          renderContactSection(page, section, tailoredResume.contact, regularFont, boldFont);
          break;
        case 'summary':
          renderTextSection(page, section, tailoredResume.summary, regularFont);
          break;
        case 'skills':
          renderSkillsSection(page, section, tailoredResume.skills, regularFont, boldFont);
          break;
        case 'experience':
          renderExperienceSection(page, section, tailoredResume.experience, regularFont, boldFont);
          break;
        case 'education':
          renderEducationSection(page, section, tailoredResume.education, regularFont, boldFont);
          break;
      }
    }
    
    // Handle overflow if needed
    const hasOverflow = checkForOverflow(sections, tailoredResume);
    
    if (hasOverflow) {
      logger.info('Content overflow detected, adding additional page');
      await addOverflowPage(pdfDoc, tailoredResume, regularFont, boldFont);
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    logger.info('Tailored resume rendered successfully');
    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error('Error rendering tailored resume', { error });
    throw new Error('Failed to render tailored resume: ' + error);
  }
}

/**
 * Represents a section in the PDF
 */
interface PDFSection {
  type: 'contact' | 'summary' | 'skills' | 'experience' | 'education' | 'other';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detects sections in the PDF based on text blocks
 */
function detectSections(textBlocks: TextBlock[]): PDFSection[] {
  // Group blocks by page
  const blocksByPage = textBlocks.reduce((acc, block) => {
    if (!acc[block.page]) {
      acc[block.page] = [];
    }
    acc[block.page].push(block);
    return acc;
  }, {} as Record<number, TextBlock[]>);
  
  const sections: PDFSection[] = [];
  
  // Process each page
  for (const [pageNum, blocks] of Object.entries(blocksByPage)) {
    const page = parseInt(pageNum);
    
    // Sort blocks by position
    const sortedBlocks = [...blocks].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Different lines
      return a.x - b.x; // Same line, sort by x
    });
    
    // Find potential section headers
    const headerBlocks = sortedBlocks.filter(block => 
      block.fontSize > 12 || block.fontWeight === 'bold'
    );
    
    // Create sections based on headers
    for (let i = 0; i < headerBlocks.length; i++) {
      const headerBlock = headerBlocks[i];
      const nextHeader = headerBlocks[i + 1];
      
      // Determine section type
      const type = getSectionType(headerBlock.text);
      
      // Find section bounds
      const sectionBlocks = sortedBlocks.filter(block => {
        if (block.page !== page) return false;
        if (block.y < headerBlock.y) return false;
        if (nextHeader && block.y >= nextHeader.y) return false;
        return true;
      });
      
      if (sectionBlocks.length > 0) {
        // Calculate section bounds
        const minX = Math.min(...sectionBlocks.map(b => b.x));
        const minY = Math.min(...sectionBlocks.map(b => b.y));
        const maxX = Math.max(...sectionBlocks.map(b => b.x + b.width));
        const maxY = Math.max(...sectionBlocks.map(b => b.y + b.height));
        
        sections.push({
          type,
          page,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        });
      }
    }
    
    // If no headers found, create a single section for the page
    if (headerBlocks.length === 0 && sortedBlocks.length > 0) {
      const minX = Math.min(...sortedBlocks.map(b => b.x));
      const minY = Math.min(...sortedBlocks.map(b => b.y));
      const maxX = Math.max(...sortedBlocks.map(b => b.x + b.width));
      const maxY = Math.max(...sortedBlocks.map(b => b.y + b.height));
      
      sections.push({
        type: 'other',
        page,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      });
    }
  }
  
  return sections;
}

/**
 * Determines the section type based on the header text
 */
function getSectionType(text: string): PDFSection['type'] {
  const lowerText = text.toLowerCase();
  
  if (/contact|email|phone|address|location/.test(lowerText)) {
    return 'contact';
  } else if (/summary|profile|objective|about/.test(lowerText)) {
    return 'summary';
  } else if (/skills|competencies|proficiencies|technologies/.test(lowerText)) {
    return 'skills';
  } else if (/experience|employment|work|career|history/.test(lowerText)) {
    return 'experience';
  } else if (/education|academic|degree|university|college|school/.test(lowerText)) {
    return 'education';
  } else {
    return 'other';
  }
}

/**
 * Renders the contact section
 */
function renderContactSection(
  page: any,
  section: PDFSection,
  contact: TailoredResume['contact'],
  regularFont: PDFFont,
  boldFont: PDFFont
) {
  const { x, y, width } = section;
  let currentY = y;
  
  // Name
  if (contact.name) {
    page.drawText(contact.name, {
      x: x + width / 2 - boldFont.widthOfTextAtSize(contact.name, 14) / 2,
      y: currentY,
      font: boldFont,
      size: 14,
    });
    currentY += 20;
  }
  
  // Contact info
  const contactInfo: string[] = [];
  
  if (contact.email) contactInfo.push(contact.email);
  if (contact.phone) contactInfo.push(contact.phone);
  if (contact.location) contactInfo.push(contact.location);
  
  if (contactInfo.length > 0) {
    const infoText = contactInfo.join(' | ');
    page.drawText(infoText, {
      x: x + width / 2 - regularFont.widthOfTextAtSize(infoText, 10) / 2,
      y: currentY,
      font: regularFont,
      size: 10,
    });
    currentY += 15;
  }
  
  // Links
  if (contact.links && contact.links.length > 0) {
    const linksText = contact.links.join(' | ');
    page.drawText(linksText, {
      x: x + width / 2 - regularFont.widthOfTextAtSize(linksText, 10) / 2,
      y: currentY,
      font: regularFont,
      size: 10,
    });
  }
}

/**
 * Renders a text section
 */
function renderTextSection(
  page: any,
  section: PDFSection,
  text: string,
  font: PDFFont
) {
  const { x, y, width, height } = section;
  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  
  // Word wrap the text
  const lines = wordWrap(text, width, font, fontSize);
  
  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const lineY = y + height - (i + 1) * lineHeight;
    
    // Stop if we run out of space
    if (lineY < y) break;
    
    page.drawText(lines[i], {
      x,
      y: lineY,
      font,
      size: fontSize,
    });
  }
}

/**
 * Renders the skills section
 */
function renderSkillsSection(
  page: any,
  section: PDFSection,
  skills: string[],
  regularFont: PDFFont,
  boldFont: PDFFont
) {
  const { x, y, width, height } = section;
  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  
  // Draw section header
  page.drawText('Skills', {
    x,
    y: y + height - lineHeight,
    font: boldFont,
    size: fontSize + 2,
  });
  
  // Format skills as a comma-separated list
  const skillsText = skills.join(', ');
  
  // Word wrap the skills text
  const lines = wordWrap(skillsText, width, regularFont, fontSize);
  
  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const lineY = y + height - (i + 2) * lineHeight;
    
    // Stop if we run out of space
    if (lineY < y) break;
    
    page.drawText(lines[i], {
      x,
      y: lineY,
      font: regularFont,
      size: fontSize,
    });
  }
}

/**
 * Renders the experience section
 */
function renderExperienceSection(
  page: any,
  section: PDFSection,
  experience: TailoredResume['experience'],
  regularFont: PDFFont,
  boldFont: PDFFont
) {
  const { x, y, width, height } = section;
  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  
  // Draw section header
  page.drawText('Experience', {
    x,
    y: y + height - lineHeight,
    font: boldFont,
    size: fontSize + 2,
  });
  
  let currentY = y + height - 2 * lineHeight;
  
  // Draw each experience item
  for (const exp of experience) {
    // Stop if we run out of space
    if (currentY < y + 2 * lineHeight) break;
    
    // Add spacing between items
    currentY -= lineHeight;
    
    // Title and company
    const titleCompany = `${exp.title}${exp.company ? ' at ' + exp.company : ''}`;
    page.drawText(titleCompany, {
      x,
      y: currentY,
      font: boldFont,
      size: fontSize,
    });
    currentY -= lineHeight;
    
    // Dates and location
    if (exp.startDate || exp.endDate || exp.location) {
      const dateLocation = [
        exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : '',
        exp.location || ''
      ].filter(Boolean).join(' | ');
      
      if (dateLocation) {
        page.drawText(dateLocation, {
          x,
          y: currentY,
          font: regularFont,
          size: fontSize - 1,
        });
        currentY -= lineHeight;
      }
    }
    
    // Bullets
    for (const bullet of exp.bullets) {
      // Word wrap the bullet text
      const bulletLines = wordWrap(`• ${bullet}`, width - 10, regularFont, fontSize);
      
      // Draw each line
      for (const line of bulletLines) {
        // Stop if we run out of space
        if (currentY < y) break;
        
        page.drawText(line, {
          x: x + 10,
          y: currentY,
          font: regularFont,
          size: fontSize,
        });
        currentY -= lineHeight;
      }
    }
  }
}

/**
 * Renders the education section
 */
function renderEducationSection(
  page: any,
  section: PDFSection,
  education: TailoredResume['education'],
  regularFont: PDFFont,
  boldFont: PDFFont
) {
  const { x, y, width, height } = section;
  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  
  // Draw section header
  page.drawText('Education', {
    x,
    y: y + height - lineHeight,
    font: boldFont,
    size: fontSize + 2,
  });
  
  let currentY = y + height - 2 * lineHeight;
  
  // Draw each education item
  for (const edu of education) {
    // Stop if we run out of space
    if (currentY < y + 2 * lineHeight) break;
    
    // Add spacing between items
    currentY -= lineHeight;
    
    // School and degree
    const schoolDegree = `${edu.school}${edu.degree ? ', ' + edu.degree : ''}`;
    page.drawText(schoolDegree, {
      x,
      y: currentY,
      font: boldFont,
      size: fontSize,
    });
    currentY -= lineHeight;
    
    // Dates, location, and GPA
    const dateLocationGpa = [
      edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : '',
      edu.location || '',
      edu.gpa ? `GPA: ${edu.gpa}` : ''
    ].filter(Boolean).join(' | ');
    
    if (dateLocationGpa) {
      page.drawText(dateLocationGpa, {
        x,
        y: currentY,
        font: regularFont,
        size: fontSize - 1,
      });
      currentY -= lineHeight;
    }
    
    // Details
    if (edu.details && edu.details.length > 0) {
      for (const detail of edu.details) {
        // Word wrap the detail text
        const detailLines = wordWrap(`• ${detail}`, width - 10, regularFont, fontSize);
        
        // Draw each line
        for (const line of detailLines) {
          // Stop if we run out of space
          if (currentY < y) break;
          
          page.drawText(line, {
            x: x + 10,
            y: currentY,
            font: regularFont,
            size: fontSize,
          });
          currentY -= lineHeight;
        }
      }
    }
  }
}

/**
 * Checks if there is overflow content that doesn't fit in the original sections
 */
function checkForOverflow(sections: PDFSection[], resume: TailoredResume): boolean {
  // This is a simplified check
  // In a real implementation, you would need to calculate the actual space needed
  
  // Check if any sections are missing
  const hasContactSection = sections.some(s => s.type === 'contact');
  const hasSummarySection = sections.some(s => s.type === 'summary');
  const hasSkillsSection = sections.some(s => s.type === 'skills');
  const hasExperienceSection = sections.some(s => s.type === 'experience');
  const hasEducationSection = sections.some(s => s.type === 'education');
  
  // Check if there are more experience items than can fit
  const experienceSection = sections.find(s => s.type === 'experience');
  const hasExperienceOverflow = experienceSection && 
    resume.experience.length > 2 && 
    resume.experience.reduce((total, exp) => total + exp.bullets.length, 0) > 10;
  
  return !hasContactSection || 
         !hasSummarySection || 
         !hasSkillsSection || 
         !hasExperienceSection || 
         !hasEducationSection ||
         hasExperienceOverflow;
}

/**
 * Adds an overflow page for content that doesn't fit in the original sections
 */
async function addOverflowPage(
  pdfDoc: any,
  resume: TailoredResume,
  regularFont: PDFFont,
  boldFont: PDFFont
) {
  // Add a new page
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  
  // Set margins
  const margin = 50;
  const contentWidth = width - 2 * margin;
  
  // Draw header
  page.drawText('Additional Information', {
    x: margin,
    y: height - margin,
    font: boldFont,
    size: 16,
  });
  
  let currentY = height - margin - 30;
  const fontSize = 11;
  const lineHeight = fontSize * 1.2;
  
  // Draw summary if not already included
  if (resume.summary) {
    page.drawText('Summary', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: fontSize + 2,
    });
    currentY -= lineHeight * 1.5;
    
    const summaryLines = wordWrap(resume.summary, contentWidth, regularFont, fontSize);
    for (const line of summaryLines) {
      page.drawText(line, {
        x: margin,
        y: currentY,
        font: regularFont,
        size: fontSize,
      });
      currentY -= lineHeight;
    }
    
    currentY -= lineHeight;
  }
  
  // Draw skills if not already included
  if (resume.skills.length > 0) {
    page.drawText('Skills', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: fontSize + 2,
    });
    currentY -= lineHeight * 1.5;
    
    const skillsText = resume.skills.join(', ');
    const skillsLines = wordWrap(skillsText, contentWidth, regularFont, fontSize);
    
    for (const line of skillsLines) {
      page.drawText(line, {
        x: margin,
        y: currentY,
        font: regularFont,
        size: fontSize,
      });
      currentY -= lineHeight;
    }
    
    currentY -= lineHeight;
  }
  
  // Draw experience if not already included or if there's overflow
  if (resume.experience.length > 0) {
    page.drawText('Experience', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: fontSize + 2,
    });
    currentY -= lineHeight * 1.5;
    
    for (const exp of resume.experience) {
      // Title and company
      const titleCompany = `${exp.title}${exp.company ? ' at ' + exp.company : ''}`;
      page.drawText(titleCompany, {
        x: margin,
        y: currentY,
        font: boldFont,
        size: fontSize,
      });
      currentY -= lineHeight;
      
      // Dates and location
      if (exp.startDate || exp.endDate || exp.location) {
        const dateLocation = [
          exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : '',
          exp.location || ''
        ].filter(Boolean).join(' | ');
        
        if (dateLocation) {
          page.drawText(dateLocation, {
            x: margin,
            y: currentY,
            font: regularFont,
            size: fontSize - 1,
          });
          currentY -= lineHeight;
        }
      }
      
      // Bullets
      for (const bullet of exp.bullets) {
        const bulletLines = wordWrap(`• ${bullet}`, contentWidth - 10, regularFont, fontSize);
        
        for (const line of bulletLines) {
          page.drawText(line, {
            x: margin + 10,
            y: currentY,
            font: regularFont,
            size: fontSize,
          });
          currentY -= lineHeight;
        }
      }
      
      currentY -= lineHeight;
    }
  }
  
  // Draw education if not already included
  if (resume.education.length > 0) {
    page.drawText('Education', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: fontSize + 2,
    });
    currentY -= lineHeight * 1.5;
    
    for (const edu of resume.education) {
      // School and degree
      const schoolDegree = `${edu.school}${edu.degree ? ', ' + edu.degree : ''}`;
      page.drawText(schoolDegree, {
        x: margin,
        y: currentY,
        font: boldFont,
        size: fontSize,
      });
      currentY -= lineHeight;
      
      // Dates, location, and GPA
      const dateLocationGpa = [
        edu.startDate && edu.endDate ? `${edu.startDate} - ${edu.endDate}` : '',
        edu.location || '',
        edu.gpa ? `GPA: ${edu.gpa}` : ''
      ].filter(Boolean).join(' | ');
      
      if (dateLocationGpa) {
        page.drawText(dateLocationGpa, {
          x: margin,
          y: currentY,
          font: regularFont,
          size: fontSize - 1,
        });
        currentY -= lineHeight;
      }
      
      // Details
      if (edu.details && edu.details.length > 0) {
        for (const detail of edu.details) {
          const detailLines = wordWrap(`• ${detail}`, contentWidth - 10, regularFont, fontSize);
          
          for (const line of detailLines) {
            page.drawText(line, {
              x: margin + 10,
              y: currentY,
              font: regularFont,
              size: fontSize,
            });
            currentY -= lineHeight;
          }
        }
      }
      
      currentY -= lineHeight;
    }
  }
  
  // Draw gaps if any
  if (resume.gaps && resume.gaps.length > 0) {
    page.drawText('Skill Gaps', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: fontSize + 2,
    });
    currentY -= lineHeight * 1.5;
    
    for (const gap of resume.gaps) {
      const gapLines = wordWrap(`• ${gap}`, contentWidth - 10, regularFont, fontSize);
      
      for (const line of gapLines) {
        page.drawText(line, {
          x: margin + 10,
          y: currentY,
          font: regularFont,
          size: fontSize,
        });
        currentY -= lineHeight;
      }
    }
  }
}

/**
 * Word wraps text to fit within a specified width
 */
function wordWrap(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
