import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from 'fontkit';
import pdfParse from 'pdf-parse';
import path from 'path';
import fs from 'fs';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-processor');

// Font configuration
const FONTS_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'fonts');
const FONTS = {
  regular: 'NotoSans-Regular.ttf',
  bold: 'NotoSans-Bold.ttf',
  serif: 'NotoSerif-Regular.ttf',
  mono: 'DejaVuSansMono.ttf'
} as const;

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
  serif: PDFFont;
  mono: PDFFont;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
}

interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string[];
  fontSize: number;
  lineHeight: number;
  isBold?: boolean;
}

interface LayoutFeedback {
  overflowChars: number;
  section: string;
  suggestedReduction: number;
}

export interface ResumeContent {
  summary?: string;
  skills?: string[];
  experience: Array<{
    role: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  projects?: Array<{
    name: string;
    bullets: string[];
  }>;
  education?: string;
}

async function loadFonts(doc: PDFDocument): Promise<FontSet> {
  // Register fontkit
  doc.registerFontkit(fontkit);
  
  // Load and embed fonts
  const fonts = {} as FontSet;
  for (const [key, filename] of Object.entries(FONTS)) {
    const fontPath = path.join(FONTS_DIR, filename);
    const fontBytes = fs.readFileSync(fontPath);
    fonts[key as keyof FontSet] = await doc.embedFont(fontBytes);
  }
  
  return fonts;
}

async function extractText(pdfBytes: Buffer | Uint8Array): Promise<string> {
  try {
    const data = await pdfParse(Buffer.from(pdfBytes));
    return data.text;
  } catch (error) {
    logger.error('Failed to extract text from PDF', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to extract text from PDF');
  }
}

function detectLayout(textItems: TextItem[]): LayoutBox[] {
  // Group text items by vertical position (with small threshold)
  const lineThreshold = 2;
  const lines = new Map<number, TextItem[]>();
  
  textItems.forEach(item => {
    let foundLine = false;
    for (const [y, items] of lines.entries()) {
      if (Math.abs(item.y - y) <= lineThreshold) {
        items.push(item);
        foundLine = true;
        break;
      }
    }
    if (!foundLine) {
      lines.set(item.y, [item]);
    }
  });

  // Sort items in each line by x position
  for (const items of lines.values()) {
    items.sort((a, b) => a.x - b.x);
  }

  // Detect sections based on font size changes and spacing
  const boxes: LayoutBox[] = [];
  let currentBox: LayoutBox | null = null;

  for (const [y, items] of lines.entries()) {
    const text = items.map(i => i.text).join(' ');
    const fontSize = items[0].fontSize;
    const isBold = items[0].fontName.toLowerCase().includes('bold');

    if (!currentBox || 
        Math.abs(fontSize - currentBox.fontSize) > 2 ||
        y - (currentBox.y + currentBox.height) > currentBox.lineHeight * 1.5) {
      // Start new box
      if (currentBox) {
        boxes.push(currentBox);
      }
      currentBox = {
        x: items[0].x,
        y,
        width: items[items.length - 1].x + items[items.length - 1].width - items[0].x,
        height: fontSize,
        text: [text],
        fontSize,
        lineHeight: fontSize * 1.2,
        isBold
      };
    } else {
      // Add to current box
      currentBox.text.push(text);
      currentBox.height = y + fontSize - currentBox.y;
    }
  }

  if (currentBox) {
    boxes.push(currentBox);
  }

  return boxes;
}

async function composeResume(
  templatePdfBytes: Buffer | Uint8Array,
  content: ResumeContent,
  options: {
    maxWidth?: number;
    margins?: { left: number; right: number; top: number; bottom: number };
  } = {}
): Promise<{ pdf: Uint8Array; feedback?: LayoutFeedback }> {
  // Load template PDF
  const templateDoc = await PDFDocument.load(templatePdfBytes);
  const templatePage = templateDoc.getPages()[0];
  const { width, height } = templatePage.getSize();

  // Create new document
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  
  // Load fonts
  const fonts = await loadFonts(doc);

  // Copy template as background
  const [copiedPage] = await doc.copyPages(templateDoc, [0]);
  page.drawPage(copiedPage);

  // Default margins and max width
  const margins = options.margins || { left: 72, right: 72, top: 72, bottom: 72 };
  const maxWidth = options.maxWidth || width - margins.left - margins.right;

  // Track overflow
  let totalOverflow = 0;

  // Helper to add text with proper wrapping
  function addText(
    text: string,
    x: number,
    y: number,
    options: {
      font: PDFFont;
      fontSize: number;
      lineHeight?: number;
      maxWidth?: number;
    }
  ): number {
    const words = text.split(' ');
    const lineHeight = options.lineHeight || options.fontSize * 1.2;
    const maxW = options.maxWidth || maxWidth;
    
    let currentLine = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = options.font.widthOfTextAtSize(testLine, options.fontSize);
      
      if (width > maxW && currentLine) {
        page.drawText(currentLine, {
          x,
          y: currentY,
          font: options.font,
          size: options.fontSize,
          color: rgb(0, 0, 0)
        });
        currentLine = word;
        currentY -= lineHeight;
        
        // Check for overflow
        if (currentY < margins.bottom) {
          totalOverflow += text.length - words.indexOf(word);
          return currentY;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x,
        y: currentY,
        font: options.font,
        size: options.fontSize,
        color: rgb(0, 0, 0)
      });
    }
    
    return currentY;
  }

  // Compose sections
  let currentY = height - margins.top;
  
  // Summary
  if (content.summary) {
    currentY = addText(content.summary, margins.left, currentY, {
      font: fonts.regular,
      fontSize: 11
    });
    currentY -= 20;
  }

  // Skills
  if (content.skills?.length) {
    currentY = addText('Skills', margins.left, currentY, {
      font: fonts.bold,
      fontSize: 12
    });
    currentY -= 10;
    
    currentY = addText(content.skills.join(' • '), margins.left, currentY, {
      font: fonts.regular,
      fontSize: 10
    });
    currentY -= 20;
  }

  // Experience
  if (content.experience?.length) {
    currentY = addText('Experience', margins.left, currentY, {
      font: fonts.bold,
      fontSize: 12
    });
    currentY -= 10;

    for (const exp of content.experience) {
      // Role and company
      currentY = addText(`${exp.role} - ${exp.company}`, margins.left, currentY, {
        font: fonts.bold,
        fontSize: 11
      });
      
      // Dates
      const dateWidth = fonts.regular.widthOfTextAtSize(exp.dates, 10);
      page.drawText(exp.dates, {
        x: width - margins.right - dateWidth,
        y: currentY,
        font: fonts.regular,
        size: 10,
        color: rgb(0, 0, 0)
      });
      
      currentY -= 15;

      // Bullets
      for (const bullet of exp.bullets) {
        page.drawText('•', {
          x: margins.left,
          y: currentY,
          font: fonts.regular,
          size: 10,
          color: rgb(0, 0, 0)
        });
        
        currentY = addText(bullet, margins.left + 15, currentY, {
          font: fonts.regular,
          fontSize: 10,
          maxWidth: maxWidth - 15
        });
        currentY -= 12;
      }
      
      currentY -= 10;
    }
  }

  // Projects
  if (content.projects?.length) {
    currentY = addText('Projects', margins.left, currentY, {
      font: fonts.bold,
      fontSize: 12
    });
    currentY -= 10;

    for (const project of content.projects) {
      currentY = addText(project.name, margins.left, currentY, {
        font: fonts.bold,
        fontSize: 11
      });
      currentY -= 15;

      for (const bullet of project.bullets) {
        page.drawText('•', {
          x: margins.left,
          y: currentY,
          font: fonts.regular,
          size: 10,
          color: rgb(0, 0, 0)
        });
        
        currentY = addText(bullet, margins.left + 15, currentY, {
          font: fonts.regular,
          fontSize: 10,
          maxWidth: maxWidth - 15
        });
        currentY -= 12;
      }
      
      currentY -= 10;
    }
  }

  // Education
  if (content.education) {
    currentY = addText('Education', margins.left, currentY, {
      font: fonts.bold,
      fontSize: 12
    });
    currentY -= 10;
    
    currentY = addText(content.education, margins.left, currentY, {
      font: fonts.regular,
      fontSize: 10
    });
  }

  // Generate feedback if there was overflow
  let feedback: LayoutFeedback | undefined;
  if (totalOverflow > 0) {
    feedback = {
      overflowChars: totalOverflow,
      section: 'experience', // Assume experience section needs reduction
      suggestedReduction: Math.ceil(totalOverflow * 1.2) // Add 20% buffer
    };
  }

  return {
    pdf: await doc.save(),
    feedback
  };
}

export const pdfProcessor = {
  extractText,
  detectLayout,
  composeResume
};
