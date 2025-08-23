// Load browser polyfills first
import './browser-polyfill';

import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import fontkit from 'fontkit';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import fs from 'fs';
import path from 'path';
import Hypher from 'hypher';
import english from 'hyphenation.en-us';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf:format-preserving');
const hypher = new Hypher(english);

// Initialize PDF.js
const pdfjsLib = pdfjs;
// Use the Node.js version without requiring a worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '';
// Disable worker to run in Node environment
pdfjsLib.disableWorker = true;
// Set isEvalSupported to false for Node environment
pdfjsLib.isEvalSupported = false;

// Font paths
const FONTS_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'fonts');
const NOTO_SANS_REGULAR = path.join(FONTS_DIR, 'NotoSans-Regular.ttf');
const NOTO_SANS_BOLD = path.join(FONTS_DIR, 'NotoSans-Bold.ttf');
const NOTO_SERIF_REGULAR = path.join(FONTS_DIR, 'NotoSerif-Regular.ttf');
const DEJAVU_SANS_MONO = path.join(FONTS_DIR, 'DejaVuSansMono.ttf');

// Font mapping
const FONT_MAP: Record<string, { regular: string; bold: string }> = {
  'Arial': { regular: NOTO_SANS_REGULAR, bold: NOTO_SANS_BOLD },
  'Helvetica': { regular: NOTO_SANS_REGULAR, bold: NOTO_SANS_BOLD },
  'Times': { regular: NOTO_SERIF_REGULAR, bold: NOTO_SANS_BOLD },
  'Times-Roman': { regular: NOTO_SERIF_REGULAR, bold: NOTO_SANS_BOLD },
  'Courier': { regular: DEJAVU_SANS_MONO, bold: DEJAVU_SANS_MONO },
  'Calibri': { regular: NOTO_SANS_REGULAR, bold: NOTO_SANS_BOLD },
  'Default': { regular: NOTO_SANS_REGULAR, bold: NOTO_SANS_BOLD },
};

// Text item from PDF.js
interface TextItem {
  x: number;
  y: number;
  text: string;
  fontName: string;
  fontSize: number;
  transform: number[];
  width: number;
  height: number;
  isBold: boolean;
}

// Layout box for text placement
interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
  lineHeight: number;
  fontName: string;
  fontSize: number;
  isBold: boolean;
  items: TextItem[];
  isHeader: boolean;
}

// Font map for embedding
interface FontMap {
  [fontName: string]: {
    regular: PDFFont;
    bold: PDFFont;
  };
}

// Section data for the resume
interface ResumeSection {
  title?: string;
  content: string[];
}

/**
 * Parse a PDF template to extract layout information
 */
async function parseTemplate(pdfBytes: Uint8Array): Promise<{
  pageSize: { width: number; height: number };
  textItems: TextItem[];
  layoutBoxes: LayoutBox[];
  headers: TextItem[];
  bullets: Set<string>;
}> {
  try {
    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1); // Get the first page
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Extract text content
    const textContent = await page.getTextContent();
    
    // Process text items
    const textItems: TextItem[] = textContent.items
      .filter(item => 'str' in item && item.str.trim().length > 0)
      .map((item: any) => {
        const transform = item.transform;
        const fontName = item.fontName || 'Default';
        const fontSize = Math.abs(transform[3]) || 12; // Extract font size from transform matrix
        
        // Determine if the font is bold based on name
        const isBold = fontName.toLowerCase().includes('bold') || 
                      fontName.toLowerCase().includes('heavy') ||
                      fontName.toLowerCase().includes('black');
        
        return {
          x: transform[4],
          y: viewport.height - transform[5], // Convert to PDF coordinates (origin at bottom-left)
          text: item.str,
          fontName,
          fontSize,
          transform: item.transform,
          width: item.width || 0,
          height: item.height || 0,
          isBold
        };
      });
    
    // Detect bullet characters
    const bullets = new Set<string>();
    textItems.forEach(item => {
      if (item.text.trim().match(/^[•\-–·\u2022\u2023\u25E6\u2043\u2219]/) || 
          item.text.trim().startsWith('*')) {
        bullets.add(item.text.trim()[0]);
      }
    });
    
    // Identify headers based on font size and style
    const avgFontSize = textItems.reduce((sum, item) => sum + item.fontSize, 0) / textItems.length;
    const headers = textItems.filter(item => 
      (item.fontSize > avgFontSize * 1.2 || item.isBold) && 
      item.text.trim().length > 0 &&
      !item.text.trim().match(/^[•\-–·\u2022\u2023\u25E6\u2043\u2219]/)
    );
    
    // Build layout boxes
    const layoutBoxes = buildLayoutMap(textItems, headers);
    
    return {
      pageSize: { width: viewport.width, height: viewport.height },
      textItems,
      layoutBoxes,
      headers,
      bullets
    };
  } catch (error) {
    logger.error('Error parsing PDF template', { error });
    throw new Error('Failed to parse PDF template');
  }
}

/**
 * Build layout map from text items
 */
function buildLayoutMap(textItems: TextItem[], headers: TextItem[]): LayoutBox[] {
  const boxes: LayoutBox[] = [];
  
  // Group text items by their vertical position (with some tolerance)
  const yTolerance = 2; // Points
  const lines: TextItem[][] = [];
  
  // Sort items by y-coordinate (top to bottom)
  const sortedItems = [...textItems].sort((a, b) => a.y - b.y);
  
  // Group into lines
  let currentLine: TextItem[] = [];
  let currentY = -1;
  
  sortedItems.forEach(item => {
    if (currentY < 0 || Math.abs(item.y - currentY) <= yTolerance) {
      currentLine.push(item);
      currentY = (currentY * currentLine.length + item.y) / (currentLine.length + 1); // Average y
    } else {
      if (currentLine.length > 0) {
        lines.push([...currentLine].sort((a, b) => a.x - b.x)); // Sort line items by x
      }
      currentLine = [item];
      currentY = item.y;
    }
  });
  
  // Add the last line
  if (currentLine.length > 0) {
    lines.push([...currentLine].sort((a, b) => a.x - b.x));
  }
  
  // Find line spacing
  const lineSpacings: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const prevY = lines[i-1][0].y;
    const currY = lines[i][0].y;
    lineSpacings.push(Math.abs(currY - prevY));
  }
  
  // Calculate average line spacing
  const avgLineSpacing = lineSpacings.length > 0 
    ? lineSpacings.reduce((sum, spacing) => sum + spacing, 0) / lineSpacings.length
    : 12; // Default if we can't determine
  
  // Group lines into layout boxes
  let currentBox: LayoutBox | null = null;
  
  lines.forEach((line, lineIndex) => {
    // Check if this line starts a new section (header)
    const isHeader = line.some(item => headers.some(h => h.text === item.text && Math.abs(h.y - item.y) < 2));
    
    // If it's a header or first line, start a new box
    if (isHeader || !currentBox) {
      if (currentBox) {
        boxes.push(currentBox);
      }
      
      // Get the leftmost item in the line
      const firstItem = line[0];
      
      currentBox = {
        x: firstItem.x,
        y: firstItem.y,
        width: line.reduce((max, item) => Math.max(max, item.x + item.width), 0) - firstItem.x,
        height: 0, // Will calculate as we add items
        lineHeight: avgLineSpacing,
        fontName: firstItem.fontName,
        fontSize: firstItem.fontSize,
        isBold: firstItem.isBold,
        items: [],
        isHeader
      };
    }
    
    // Add items to the current box
    line.forEach(item => {
      if (currentBox) {
        currentBox.items.push(item);
        
        // Update box dimensions
        currentBox.width = Math.max(currentBox.width, item.x + item.width - currentBox.x);
        currentBox.height = Math.max(currentBox.height, currentBox.y - item.y + item.height);
      }
    });
  });
  
  // Add the last box
  if (currentBox) {
    boxes.push(currentBox);
  }
  
  return boxes;
}

/**
 * Extract font map from PDF
 */
async function extractFontMap(pdfBytes: Uint8Array): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const operatorList = await page.getOperatorList();
    
    const fontNames = new Set<string>();
    
    // Extract font names from the operator list
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i];
      if (op === pdfjsLib.OPS.setFont) {
        const fontKey = operatorList.argsArray[i][0];
        if (typeof fontKey === 'string') {
          fontNames.add(fontKey);
        }
      }
    }
    
    return Array.from(fontNames);
  } catch (error) {
    logger.error('Error extracting font map', { error });
    return [];
  }
}

/**
 * Load and register fonts
 */
async function loadFonts(pdfDoc: PDFDocument, fontNames: string[]): Promise<FontMap> {
  // Register fontkit
  pdfDoc.registerFontkit(fontkit);
  
  const fontMap: FontMap = {};
  
  // Load fallback fonts
  try {
    const notoSansRegularBytes = fs.existsSync(NOTO_SANS_REGULAR) 
      ? fs.readFileSync(NOTO_SANS_REGULAR)
      : await pdfDoc.embedFont('Helvetica');
      
    const notoSansBoldBytes = fs.existsSync(NOTO_SANS_BOLD)
      ? fs.readFileSync(NOTO_SANS_BOLD)
      : await pdfDoc.embedFont('Helvetica-Bold');
    
    const notoSerifRegularBytes = fs.existsSync(NOTO_SERIF_REGULAR)
      ? fs.readFileSync(NOTO_SERIF_REGULAR)
      : await pdfDoc.embedFont('Times-Roman');
      
    const dejavuSansMonoBytes = fs.existsSync(DEJAVU_SANS_MONO)
      ? fs.readFileSync(DEJAVU_SANS_MONO)
      : await pdfDoc.embedFont('Courier');
    
    // Embed default fonts
    const notoSansRegular = await pdfDoc.embedFont(notoSansRegularBytes, { subset: true });
    const notoSansBold = await pdfDoc.embedFont(notoSansBoldBytes, { subset: true });
    const notoSerifRegular = await pdfDoc.embedFont(notoSerifRegularBytes, { subset: true });
    const dejavuSansMono = await pdfDoc.embedFont(dejavuSansMonoBytes, { subset: true });
    
    // Map fonts
    fontMap['Default'] = {
      regular: notoSansRegular,
      bold: notoSansBold
    };
    
    // Map common fonts to our embedded fonts
    for (const fontName of fontNames) {
      const baseName = fontName.split('-')[0].split('+').pop() || 'Default';
      
      if (baseName.includes('Arial') || baseName.includes('Helvetica') || baseName.includes('Calibri')) {
        fontMap[fontName] = {
          regular: notoSansRegular,
          bold: notoSansBold
        };
      } else if (baseName.includes('Times') || baseName.includes('Georgia')) {
        fontMap[fontName] = {
          regular: notoSerifRegular,
          bold: notoSansBold
        };
      } else if (baseName.includes('Courier') || baseName.includes('Mono')) {
        fontMap[fontName] = {
          regular: dejavuSansMono,
          bold: dejavuSansMono
        };
      } else {
        // Default to Noto Sans
        fontMap[fontName] = {
          regular: notoSansRegular,
          bold: notoSansBold
        };
      }
    }
  } catch (error) {
    logger.error('Error loading fonts', { error });
    throw new Error('Failed to load fonts');
  }
  
  return fontMap;
}

/**
 * Compose a new PDF with the tailored content while preserving the original format
 */
async function composeNewPdf({
  templatePdfBytes,
  sections,
  fontMap
}: {
  templatePdfBytes: Uint8Array;
  sections: {
    summary?: string;
    skills?: string[];
    experience: Array<{ role: string; company: string; dates: string; bullets: string[] }>;
    projects?: Array<{ name: string; bullets: string[] }>;
    education?: string;
  };
  fontMap: FontMap;
}): Promise<{ pdfBytes: Uint8Array; layoutFeedback?: string }> {
  try {
    // Parse the template PDF
    const template = await parseTemplate(templatePdfBytes);
    const { pageSize, layoutBoxes, bullets } = template;
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    
    // Import the original page as background
    const templateDoc = await PDFDocument.load(templatePdfBytes);
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    page.drawPage(templatePage);
    
    // Convert sections to a flat structure for easier processing
    const flatSections: Record<string, Array<{ text: string; isBold: boolean; isBullet: boolean }>> = {
      summary: [],
      skills: [],
      experience: [],
      projects: [],
      education: []
    };
    
    // Process summary if it exists
    if (sections.summary) {
      // Parse markdown bold syntax
      const boldRegex = /\*\*(.*?)\*\*/g;
      let summary = sections.summary;
      let match;
      let lastIndex = 0;
      
      while ((match = boldRegex.exec(summary)) !== null) {
        // Add text before the bold part
        if (match.index > lastIndex) {
          flatSections.summary.push({
            text: summary.substring(lastIndex, match.index),
            isBold: false,
            isBullet: false
          });
        }
        
        // Add the bold text
        flatSections.summary.push({
          text: match[1], // The text inside ** **
          isBold: true,
          isBullet: false
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add any remaining text after the last bold part
      if (lastIndex < summary.length) {
        flatSections.summary.push({
          text: summary.substring(lastIndex),
          isBold: false,
          isBullet: false
        });
      }
      
      // If no bold parts were found, add the whole text
      if (flatSections.summary.length === 0) {
        flatSections.summary.push({
          text: summary,
          isBold: false,
          isBullet: false
        });
      }
    }
    
    // Process skills
    if (sections.skills && sections.skills.length > 0) {
      sections.skills.forEach(skill => {
        // Parse markdown bold syntax
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;
        let skillItems: Array<{ text: string; isBold: boolean }> = [];
        
        while ((match = boldRegex.exec(skill)) !== null) {
          // Add text before the bold part
          if (match.index > lastIndex) {
            skillItems.push({
              text: skill.substring(lastIndex, match.index),
              isBold: false
            });
          }
          
          // Add the bold text
          skillItems.push({
            text: match[1], // The text inside ** **
            isBold: true
          });
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text after the last bold part
        if (lastIndex < skill.length) {
          skillItems.push({
            text: skill.substring(lastIndex),
            isBold: false
          });
        }
        
        // If no bold parts were found, add the whole text
        if (skillItems.length === 0) {
          skillItems.push({
            text: skill,
            isBold: false
          });
        }
        
        // Add the skill items
        skillItems.forEach(item => {
          flatSections.skills.push({
            text: item.text,
            isBold: item.isBold,
            isBullet: true
          });
        });
      });
    }
    
    // Process experience
    sections.experience.forEach(exp => {
      // Add the role/company/dates line
      flatSections.experience.push({
        text: `${exp.role} - ${exp.company} (${exp.dates})`,
        isBold: true,
        isBullet: false
      });
      
      // Process each bullet point
      exp.bullets.forEach(bullet => {
        // Parse markdown bold syntax
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        let lastIndex = 0;
        let bulletItems: Array<{ text: string; isBold: boolean }> = [];
        
        while ((match = boldRegex.exec(bullet)) !== null) {
          // Add text before the bold part
          if (match.index > lastIndex) {
            bulletItems.push({
              text: bullet.substring(lastIndex, match.index),
              isBold: false
            });
          }
          
          // Add the bold text
          bulletItems.push({
            text: match[1], // The text inside ** **
            isBold: true
          });
          
          lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text after the last bold part
        if (lastIndex < bullet.length) {
          bulletItems.push({
            text: bullet.substring(lastIndex),
            isBold: false
          });
        }
        
        // If no bold parts were found, add the whole text
        if (bulletItems.length === 0) {
          bulletItems.push({
            text: bullet,
            isBold: false
          });
        }
        
        // Add the bullet items
        let isFirst = true;
        bulletItems.forEach(item => {
          flatSections.experience.push({
            text: isFirst ? `• ${item.text}` : item.text,
            isBold: item.isBold,
            isBullet: isFirst
          });
          isFirst = false;
        });
      });
      
      // Add spacing between experiences
      flatSections.experience.push({
        text: '',
        isBold: false,
        isBullet: false
      });
    });
    
    // Process projects if they exist
    if (sections.projects) {
      sections.projects.forEach(proj => {
        // Add the project name
        flatSections.projects.push({
          text: proj.name,
          isBold: true,
          isBullet: false
        });
        
        // Process each bullet point
        proj.bullets.forEach(bullet => {
          // Parse markdown bold syntax
          const boldRegex = /\*\*(.*?)\*\*/g;
          let match;
          let lastIndex = 0;
          let bulletItems: Array<{ text: string; isBold: boolean }> = [];
          
          while ((match = boldRegex.exec(bullet)) !== null) {
            // Add text before the bold part
            if (match.index > lastIndex) {
              bulletItems.push({
                text: bullet.substring(lastIndex, match.index),
                isBold: false
              });
            }
            
            // Add the bold text
            bulletItems.push({
              text: match[1], // The text inside ** **
              isBold: true
            });
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add any remaining text after the last bold part
          if (lastIndex < bullet.length) {
            bulletItems.push({
              text: bullet.substring(lastIndex),
              isBold: false
            });
          }
          
          // If no bold parts were found, add the whole text
          if (bulletItems.length === 0) {
            bulletItems.push({
              text: bullet,
              isBold: false
            });
          }
          
          // Add the bullet items
          let isFirst = true;
          bulletItems.forEach(item => {
            flatSections.projects.push({
              text: isFirst ? `• ${item.text}` : item.text,
              isBold: item.isBold,
              isBullet: isFirst
            });
            isFirst = false;
          });
        });
        
        // Add spacing between projects
        flatSections.projects.push({
          text: '',
          isBold: false,
          isBullet: false
        });
      });
    }
    
    // Process education if it exists
    if (sections.education) {
      // Parse markdown bold syntax
      const boldRegex = /\*\*(.*?)\*\*/g;
      let education = sections.education;
      let match;
      let lastIndex = 0;
      
      while ((match = boldRegex.exec(education)) !== null) {
        // Add text before the bold part
        if (match.index > lastIndex) {
          flatSections.education.push({
            text: education.substring(lastIndex, match.index),
            isBold: false,
            isBullet: false
          });
        }
        
        // Add the bold text
        flatSections.education.push({
          text: match[1], // The text inside ** **
          isBold: true,
          isBullet: false
        });
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add any remaining text after the last bold part
      if (lastIndex < education.length) {
        flatSections.education.push({
          text: education.substring(lastIndex),
          isBold: false,
          isBullet: false
        });
      }
      
      // If no bold parts were found, add the whole text
      if (flatSections.education.length === 0) {
        flatSections.education.push({
          text: education,
          isBold: false,
          isBullet: false
        });
      }
    }
    
    // Find layout boxes for each section
    const sectionBoxes: Record<string, LayoutBox[]> = {
      summary: [],
      skills: [],
      experience: [],
      projects: [],
      education: []
    };
    
    // Simple heuristic to match boxes to sections
    let currentSection = '';
    for (const box of layoutBoxes) {
      if (box.isHeader) {
        const headerText = box.items.map(item => item.text).join(' ').toLowerCase();
        
        if (headerText.includes('summary') || headerText.includes('profile') || headerText.includes('objective')) {
          currentSection = 'summary';
        } else if (headerText.includes('skill') || headerText.includes('technologies') || headerText.includes('expertise')) {
          currentSection = 'skills';
        } else if (headerText.includes('experience') || headerText.includes('employment') || headerText.includes('work')) {
          currentSection = 'experience';
        } else if (headerText.includes('project')) {
          currentSection = 'projects';
        } else if (headerText.includes('education') || headerText.includes('academic')) {
          currentSection = 'education';
        }
      }
      
      if (currentSection && currentSection in sectionBoxes) {
        sectionBoxes[currentSection].push(box);
      }
    }
    
    // Draw white rectangles over text areas to prepare for new content
    for (const box of layoutBoxes) {
      page.drawRectangle({
        x: box.x,
        y: pageSize.height - box.y - box.height,
        width: box.width,
        height: box.height,
        color: rgb(1, 1, 1), // White
      });
    }
    
    // Fill in the new content
    let layoutFeedback: string | undefined;
    
    for (const [sectionName, boxes] of Object.entries(sectionBoxes)) {
      if (boxes.length === 0 || !flatSections[sectionName] || flatSections[sectionName].length === 0) {
        continue;
      }
      
      // Sort boxes by y-coordinate (top to bottom)
      const sortedBoxes = [...boxes].sort((a, b) => a.y - b.y);
      
      // Fill content into boxes
      let contentIndex = 0;
      const content = flatSections[sectionName];
      
      for (const box of sortedBoxes) {
        // Skip header boxes (we'll keep the original headers)
        if (box.isHeader) {
          continue;
        }
        
        const fontSize = box.fontSize;
        const lineHeight = box.lineHeight;
        
        // Calculate how many lines can fit in this box
        const maxLines = Math.floor(box.height / lineHeight);
        let currentLine = 0;
        
        while (contentIndex < content.length && currentLine < maxLines) {
          const item = content[contentIndex];
          
          // Skip empty lines
          if (!item.text.trim()) {
            contentIndex++;
            currentLine++;
            continue;
          }
          
          // Choose the appropriate font based on bold status
          const font = item.isBold ? fontMap['Default'].bold : fontMap['Default'].regular;
          
          // Calculate indent for bullet points
          const indent = item.isBullet ? 10 : 0;
          
          // Calculate word wrapping with hyphenation for better text fitting
          const words = item.text.split(' ');
          let currentLineText = '';
          
          for (const word of words) {
            const testLine = currentLineText ? `${currentLineText} ${word}` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > box.width - indent) {
              // Try hyphenation for long words
              if (word.length > 8 && currentLineText) {
                const hyphenated = hypher.hyphenate(word);
                if (hyphenated.length > 1) {
                  // Find the best hyphenation point
                  for (let i = 1; i < hyphenated.length; i++) {
                    const partial = hyphenated.slice(0, i).join('') + '-';
                    const testWithHyphen = `${currentLineText} ${partial}`;
                    const hyphenWidth = font.widthOfTextAtSize(testWithHyphen, fontSize);
                    
                    if (hyphenWidth <= box.width - indent) {
                      // Draw the current line with hyphen
                      page.drawText(testWithHyphen, {
                        x: box.x + indent,
                        y: pageSize.height - box.y - currentLine * lineHeight,
                        font,
                        size: fontSize,
                        color: rgb(0, 0, 0)
                      });
                      
                      currentLine++;
                      currentLineText = hyphenated.slice(i).join('');
                      
                      // Check if we've exceeded the box height
                      if (currentLine >= maxLines) {
                        layoutFeedback = `${sectionName} content overflowed box #${boxes.indexOf(box) + 1}`;
                        break;
                      }
                      
                      // Continue to the next word
                      continue;
                    }
                  }
                }
              }
              
              // If hyphenation didn't work, just break at the word boundary
              page.drawText(currentLineText, {
                x: box.x + indent,
                y: pageSize.height - box.y - currentLine * lineHeight,
                font,
                size: fontSize,
                color: rgb(0, 0, 0)
              });
              
              currentLine++;
              currentLineText = word;
              
              // Check if we've exceeded the box height
              if (currentLine >= maxLines) {
                layoutFeedback = `${sectionName} content overflowed box #${boxes.indexOf(box) + 1}`;
                break;
              }
            } else {
              currentLineText = testLine;
            }
          }
          
          // Draw the last line
          if (currentLineText && currentLine < maxLines) {
            page.drawText(currentLineText, {
              x: box.x + indent,
              y: pageSize.height - box.y - currentLine * lineHeight,
              font,
              size: fontSize,
              color: rgb(0, 0, 0)
            });
            currentLine++;
          }
          
          contentIndex++;
          
          // Check if we've exceeded the box height
          if (currentLine >= maxLines) {
            layoutFeedback = `${sectionName} content overflowed box #${boxes.indexOf(box) + 1}`;
            break;
          }
        }
      }
      
      // Check if we have more content than boxes
      if (contentIndex < content.length) {
        if (!layoutFeedback) {
          layoutFeedback = `${sectionName} has more content than can fit in the available boxes`;
        }
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    return { pdfBytes, layoutFeedback };
  } catch (error) {
    logger.error('Error composing new PDF', { error });
    throw new Error('Failed to compose new PDF');
  }
}

/**
 * Shrink content if it doesn't fit
 */
async function shrinkContent(sections: any, layoutFeedback: string): Promise<any> {
  // Implement a simple shrinking strategy
  const newSections = { ...sections };
  
  // Parse the feedback to determine which section to shrink
  const sectionMatch = layoutFeedback.match(/^(\w+)/);
  if (!sectionMatch) return newSections;
  
  const sectionToShrink = sectionMatch[1];
  
  if (sectionToShrink === 'experience' && newSections.experience.length > 0) {
    // Trim the least important bullets (from the oldest experience)
    const oldestExperience = newSections.experience[newSections.experience.length - 1];
    if (oldestExperience.bullets.length > 1) {
      oldestExperience.bullets.pop();
    }
  } else if (sectionToShrink === 'projects' && newSections.projects && newSections.projects.length > 0) {
    // Trim the least important project bullets
    const lastProject = newSections.projects[newSections.projects.length - 1];
    if (lastProject.bullets.length > 1) {
      lastProject.bullets.pop();
    }
  } else if (sectionToShrink === 'summary' && newSections.summary) {
    // Trim the summary by 20%
    const words = newSections.summary.split(' ');
    const newLength = Math.floor(words.length * 0.8);
    newSections.summary = words.slice(0, newLength).join(' ');
  } else if (sectionToShrink === 'skills' && newSections.skills && newSections.skills.length > 0) {
    // Remove the least important skills (last 20%)
    const newLength = Math.floor(newSections.skills.length * 0.8);
    newSections.skills = newSections.skills.slice(0, newLength);
  }
  
  return newSections;
}

/**
 * Main function to create a format-preserving resume
 */
export async function formatPreservingResume({
  inputPdfBytes,
  tailoredSections
}: {
  inputPdfBytes: Uint8Array;
  tailoredSections: {
    summary?: string;
    skills?: string[];
    experience: Array<{ role: string; company: string; dates: string; bullets: string[] }>;
    projects?: Array<{ name: string; bullets: string[] }>;
    education?: string;
  };
}): Promise<Uint8Array> {
  try {
    // Validate input
    if (!inputPdfBytes || inputPdfBytes.length === 0) {
      throw new Error('Invalid PDF input: Empty or missing PDF bytes');
    }
    
    // Validate tailored sections
    if (!tailoredSections) {
      throw new Error('Invalid input: Missing tailored sections');
    }
    
    if (!Array.isArray(tailoredSections.experience) || tailoredSections.experience.length === 0) {
      throw new Error('Invalid input: Experience section is required and must be an array');
    }
    
    // Extract font names from the input PDF
    let fontNames: string[] = [];
    try {
      fontNames = await extractFontMap(inputPdfBytes);
      logger.info('Extracted font names', { count: fontNames.length });
    } catch (fontError) {
      logger.warn('Failed to extract fonts, using defaults', { error: String(fontError) });
      fontNames = ['Default'];
    }
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Load and register fonts
    let fontMap: FontMap;
    try {
      fontMap = await loadFonts(pdfDoc, fontNames);
      logger.info('Loaded fonts successfully');
    } catch (fontLoadError) {
      logger.error('Failed to load fonts', { error: String(fontLoadError) });
      throw new Error('Failed to load required fonts: ' + String(fontLoadError));
    }
    
    // Compose the new PDF
    let pdfBytes: Uint8Array;
    let layoutFeedback: string | undefined;
    
    try {
      const result = await composeNewPdf({
        templatePdfBytes: inputPdfBytes,
        sections: tailoredSections,
        fontMap
      });
      
      pdfBytes = result.pdfBytes;
      layoutFeedback = result.layoutFeedback;
    } catch (composeError) {
      logger.error('Failed to compose PDF', { error: String(composeError) });
      throw new Error('Failed to compose PDF: ' + String(composeError));
    }
    
    // If content doesn't fit, shrink it and try again
    if (layoutFeedback) {
      logger.info('Content overflow detected, shrinking content', { feedback: layoutFeedback });
      
      try {
        const shrunkSections = await shrinkContent(tailoredSections, layoutFeedback);
        
        const retry = await composeNewPdf({
          templatePdfBytes: inputPdfBytes,
          sections: shrunkSections,
          fontMap
        });
        
        pdfBytes = retry.pdfBytes;
        
        // If still overflowing, log but return the best we have
        if (retry.layoutFeedback) {
          logger.warn('Content still overflowing after shrinking', { feedback: retry.layoutFeedback });
        }
      } catch (shrinkError) {
        logger.warn('Failed to shrink content, using original PDF', { error: String(shrinkError) });
        // Continue with the original PDF
      }
    }
    
    // Validate output
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('Failed to generate PDF: Empty output');
    }
    
    return pdfBytes;
  } catch (error) {
    logger.error('Error in formatPreservingResume', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Re-throw with a clearer message
    throw new Error('Failed to create format-preserving resume: ' + 
      (error instanceof Error ? error.message : String(error)));
  }
}
