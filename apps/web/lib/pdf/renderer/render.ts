import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { SectionMap, SectionType } from '../analyzer/types';
import { drawTextInBox, drawBullets, whiteoutRect } from './draw';
import { addOverflowPage, OverflowContent } from './paginate';

// Font paths
const REGULAR_FONT_PATH = path.join(process.cwd(), 'apps/web/lib/pdf/fonts/Inter-Regular.ttf');
const BOLD_FONT_PATH = path.join(process.cwd(), 'apps/web/lib/pdf/fonts/Inter-Bold.ttf');

// Resume data structure
export interface ResumeData {
  profile?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company?: string;
    location?: string;
    dates?: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree?: string;
    dates?: string;
    details: string[];
  }>;
  extras?: Record<string, any>;
}

/**
 * Render a resume by modifying an existing PDF
 * @param pdfBytes Original PDF bytes
 * @param resumeData Structured resume data
 * @param sectionMap Map of sections in the original PDF
 * @param debug Whether to enable debug mode
 * @returns Modified PDF bytes
 */
export async function renderResume(
  pdfBytes: Uint8Array,
  resumeData: ResumeData,
  sectionMap: SectionMap,
  debug: boolean = false
): Promise<Uint8Array> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load and embed fonts
    let regularFont, boldFont;
    
    try {
      // Try to load custom fonts
      const regularFontBytes = fs.readFileSync(REGULAR_FONT_PATH);
      const boldFontBytes = fs.readFileSync(BOLD_FONT_PATH);
      
      regularFont = await pdfDoc.embedFont(regularFontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
    } catch (fontError) {
      console.warn('Failed to load custom fonts, using standard fonts:', fontError);
      // Fall back to standard fonts
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
    
    // Track overflow content
    const overflowContent: OverflowContent = {};
    
    // Render each section
    for (const section of sectionMap.sections) {
      const page = pdfDoc.getPage(section.page);
      
      // Whiteout the section to cover existing content
      whiteoutRect(page, section.rect);
      
      // Render content based on section type
      switch (section.label) {
        case SectionType.PROFILE:
          if (resumeData.profile) {
            const { overflowText } = await drawTextInBox(
              page,
              resumeData.profile,
              section.rect,
              regularFont,
              11,
              1.25,
              'left'
            );
            
            if (overflowText) {
              overflowContent.profile = overflowText;
            }
          }
          break;
          
        case SectionType.SKILLS:
          if (resumeData.skills && resumeData.skills.length > 0) {
            // Determine if we should render as a list or inline
            const shouldRenderAsList = section.rect.h > 50;
            
            if (shouldRenderAsList) {
              // Render as bullet points
              const { overflowBullets } = await drawBullets(
                page,
                resumeData.skills,
                section.rect,
                regularFont,
                11,
                1.25,
                '•'
              );
              
              if (overflowBullets) {
                overflowContent.skills = overflowBullets;
              }
            } else {
              // Render as comma-separated list
              const skillsText = resumeData.skills.join(', ');
              const { overflowText } = await drawTextInBox(
                page,
                skillsText,
                section.rect,
                regularFont,
                11,
                1.25,
                'left'
              );
              
              if (overflowText) {
                // Split overflow text back into skills
                overflowContent.skills = overflowText.split(', ');
              }
            }
          }
          break;
          
        case SectionType.EXPERIENCE:
          if (resumeData.experience && resumeData.experience.length > 0) {
            let y = section.rect.y;
            const overflowExperience: typeof resumeData.experience = [];
            
            for (const exp of resumeData.experience) {
              // Check if we have enough space for at least the heading
              if (y + 30 > section.rect.y + section.rect.h) {
                overflowExperience.push(exp);
                continue;
              }
              
              // Render title and company
              const titleCompany = exp.company 
                ? `${exp.title} - ${exp.company}` 
                : exp.title;
              
              const titleWidth = boldFont.widthOfTextAtSize(titleCompany, 12);
              if (titleWidth > section.rect.w) {
                // Title is too long, split it
                const { usedHeight } = await drawTextInBox(
                  page,
                  titleCompany,
                  { ...section.rect, y, h: 30 },
                  boldFont,
                  12,
                  1.25,
                  'left'
                );
                
                y += usedHeight;
              } else {
                page.drawText(titleCompany, {
                  x: section.rect.x,
                  y: y + 12, // Adjust for baseline
                  size: 12,
                  font: boldFont
                });
                
                y += 20;
              }
              
              // Render location and dates if available
              if (exp.location || exp.dates) {
                const locationDates = [exp.location, exp.dates].filter(Boolean).join(' | ');
                
                page.drawText(locationDates, {
                  x: section.rect.x,
                  y: y + 11, // Adjust for baseline
                  size: 11,
                  font: regularFont
                });
                
                y += 15;
              }
              
              // Render bullets
              if (exp.bullets && exp.bullets.length > 0) {
                const remainingHeight = section.rect.y + section.rect.h - y;
                
                if (remainingHeight < 20) {
                  // Not enough space for bullets, add to overflow
                  overflowExperience.push({
                    ...exp,
                    bullets: exp.bullets
                  });
                } else {
                  const { usedHeight, overflowBullets } = await drawBullets(
                    page,
                    exp.bullets,
                    { ...section.rect, x: section.rect.x + 15, y, w: section.rect.w - 15, h: remainingHeight },
                    regularFont,
                    11,
                    1.25,
                    '•'
                  );
                  
                  y += usedHeight + 15;
                  
                  if (overflowBullets) {
                    overflowExperience.push({
                      ...exp,
                      bullets: overflowBullets
                    });
                  }
                }
              }
            }
            
            if (overflowExperience.length > 0) {
              overflowContent.experience = overflowExperience;
            }
          }
          break;
          
        case SectionType.EDUCATION:
          if (resumeData.education && resumeData.education.length > 0) {
            let y = section.rect.y;
            const overflowEducation: typeof resumeData.education = [];
            
            for (const edu of resumeData.education) {
              // Check if we have enough space for at least the heading
              if (y + 30 > section.rect.y + section.rect.h) {
                overflowEducation.push(edu);
                continue;
              }
              
              // Render school and degree
              const schoolDegree = edu.degree 
                ? `${edu.school} - ${edu.degree}` 
                : edu.school;
              
              const schoolWidth = boldFont.widthOfTextAtSize(schoolDegree, 12);
              if (schoolWidth > section.rect.w) {
                // School/degree is too long, split it
                const { usedHeight } = await drawTextInBox(
                  page,
                  schoolDegree,
                  { ...section.rect, y, h: 30 },
                  boldFont,
                  12,
                  1.25,
                  'left'
                );
                
                y += usedHeight;
              } else {
                page.drawText(schoolDegree, {
                  x: section.rect.x,
                  y: y + 12, // Adjust for baseline
                  size: 12,
                  font: boldFont
                });
                
                y += 20;
              }
              
              // Render dates if available
              if (edu.dates) {
                page.drawText(edu.dates, {
                  x: section.rect.x,
                  y: y + 11, // Adjust for baseline
                  size: 11,
                  font: regularFont
                });
                
                y += 15;
              }
              
              // Render details
              if (edu.details && edu.details.length > 0) {
                const remainingHeight = section.rect.y + section.rect.h - y;
                
                if (remainingHeight < 20) {
                  // Not enough space for details, add to overflow
                  overflowEducation.push({
                    ...edu,
                    details: edu.details
                  });
                } else {
                  const { usedHeight, overflowBullets } = await drawBullets(
                    page,
                    edu.details,
                    { ...section.rect, x: section.rect.x + 15, y, w: section.rect.w - 15, h: remainingHeight },
                    regularFont,
                    11,
                    1.25,
                    '•'
                  );
                  
                  y += usedHeight + 15;
                  
                  if (overflowBullets) {
                    overflowEducation.push({
                      ...edu,
                      details: overflowBullets
                    });
                  }
                }
              }
            }
            
            if (overflowEducation.length > 0) {
              overflowContent.education = overflowEducation;
            }
          }
          break;
          
        case SectionType.OTHER:
          // Handle other sections if needed
          if (resumeData.extras) {
            // Implement rendering for extra sections
            overflowContent.other = resumeData.extras;
          }
          break;
      }
    }
    
    // Add overflow page if needed
    const hasOverflow = Object.keys(overflowContent).length > 0 && (
      overflowContent.profile ||
      (overflowContent.skills && overflowContent.skills.length > 0) ||
      (overflowContent.experience && overflowContent.experience.length > 0) ||
      (overflowContent.education && overflowContent.education.length > 0) ||
      overflowContent.other
    );
    
    if (hasOverflow) {
      await addOverflowPage(pdfDoc, overflowContent, regularFont, boldFont);
    }
    
    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error rendering resume:', error);
    throw error;
  }
}

/**
 * Render a fallback resume by adding a new page to the PDF
 * @param pdfBytes Original PDF bytes
 * @param resumeData Structured resume data
 * @returns Modified PDF bytes
 */
export async function renderFallbackResume(
  pdfBytes: Uint8Array,
  resumeData: ResumeData
): Promise<Uint8Array> {
  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Load and embed fonts
    let regularFont, boldFont;
    
    try {
      // Try to load custom fonts
      const regularFontBytes = fs.readFileSync(REGULAR_FONT_PATH);
      const boldFontBytes = fs.readFileSync(BOLD_FONT_PATH);
      
      regularFont = await pdfDoc.embedFont(regularFontBytes);
      boldFont = await pdfDoc.embedFont(boldFontBytes);
    } catch (fontError) {
      console.warn('Failed to load custom fonts, using standard fonts:', fontError);
      // Fall back to standard fonts
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
    
    // Create a new page for the tailored content
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    // Set margins
    const margin = 72; // 1 inch margins
    const contentWidth = width - 2 * margin;
    
    // Start position
    let y = height - margin;
    
    // Add title
    page.drawText('Tailored Resume', {
      x: margin,
      y,
      size: 18,
      font: boldFont
    });
    
    y -= 40;
    
    // Add profile section
    if (resumeData.profile) {
      page.drawText('Professional Summary', {
        x: margin,
        y,
        size: 14,
        font: boldFont
      });
      
      y -= 20;
      
      const { usedHeight } = await drawTextInBox(
        page,
        resumeData.profile,
        { x: margin, y, w: contentWidth, h: 200, page: 0 },
        regularFont,
        11,
        1.25,
        'left'
      );
      
      y -= usedHeight + 20;
    }
    
    // Add skills section
    if (resumeData.skills && resumeData.skills.length > 0) {
      page.drawText('Skills', {
        x: margin,
        y,
        size: 14,
        font: boldFont
      });
      
      y -= 20;
      
      const skillsText = resumeData.skills.join(', ');
      const { usedHeight } = await drawTextInBox(
        page,
        skillsText,
        { x: margin, y, w: contentWidth, h: 100, page: 0 },
        regularFont,
        11,
        1.25,
        'left'
      );
      
      y -= usedHeight + 20;
    }
    
    // Add experience section
    if (resumeData.experience && resumeData.experience.length > 0) {
      page.drawText('Experience', {
        x: margin,
        y,
        size: 14,
        font: boldFont
      });
      
      y -= 20;
      
      for (const exp of resumeData.experience) {
        // Check if we need a new page
        if (y < margin + 100) {
          const newPage = pdfDoc.addPage();
          page = newPage;
          y = height - margin;
        }
        
        // Draw title and company
        const titleText = exp.company 
          ? `${exp.title} - ${exp.company}` 
          : exp.title;
        
        page.drawText(titleText, {
          x: margin,
          y,
          size: 12,
          font: boldFont
        });
        
        y -= 20;
        
        // Draw location and dates if available
        if (exp.location || exp.dates) {
          const locationDates = [exp.location, exp.dates].filter(Boolean).join(' | ');
          
          page.drawText(locationDates, {
            x: margin,
            y,
            size: 11,
            font: regularFont
          });
          
          y -= 15;
        }
        
        // Draw bullets
        if (exp.bullets && exp.bullets.length > 0) {
          const { usedHeight } = await drawBullets(
            page,
            exp.bullets,
            { x: margin + 15, y, w: contentWidth - 15, h: 300, page: 0 },
            regularFont,
            11,
            1.25,
            '•'
          );
          
          y -= usedHeight + 20;
        }
      }
    }
    
    // Add education section
    if (resumeData.education && resumeData.education.length > 0) {
      // Check if we need a new page
      if (y < margin + 150) {
        const newPage = pdfDoc.addPage();
        page = newPage;
        y = height - margin;
      }
      
      page.drawText('Education', {
        x: margin,
        y,
        size: 14,
        font: boldFont
      });
      
      y -= 20;
      
      for (const edu of resumeData.education) {
        // Draw school and degree
        const schoolDegree = edu.degree 
          ? `${edu.school} - ${edu.degree}` 
          : edu.school;
        
        page.drawText(schoolDegree, {
          x: margin,
          y,
          size: 12,
          font: boldFont
        });
        
        y -= 20;
        
        // Draw dates if available
        if (edu.dates) {
          page.drawText(edu.dates, {
            x: margin,
            y,
            size: 11,
            font: regularFont
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
          
          y -= usedHeight + 20;
        }
      }
    }
    
    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error rendering fallback resume:', error);
    throw error;
  }
}
