import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { logger } from '@/lib/logging/logger';

export async function buildResumePdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  // Split into sections
  const sections = text.split(/\n(?=\w+:)/);
  
  for (const section of sections) {
    const [title, ...content] = section.split('\n');
    
    // Draw section title
    if (title.includes(':')) {
      y -= 20;
      page.drawText(title.trim(), {
        x: margin,
        y,
        font: boldFont,
        size: 12,
        color: rgb(0, 0, 0),
      });
      y -= 10;
    }

    // Draw content
    for (const line of content) {
      const trimmed = line.trim();
      if (!trimmed) {
        y -= 10;
        continue;
      }

      // Handle bullet points
      const text = trimmed.startsWith('•') ? `  ${trimmed}` : trimmed;
      
      // Word wrap
      const words = text.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const lineWidth = font.widthOfTextAtSize(testLine, 10);
        
        if (lineWidth > width) {
          page.drawText(currentLine, {
            x: margin,
            y,
            font,
            size: 10,
            color: rgb(0, 0, 0),
          });
          y -= 12;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          font,
          size: 10,
          color: rgb(0, 0, 0),
        });
        y -= 12;
      }
    }
  }

  logger.debug('Generated PDF with dimensions:', {
    width: page.getWidth(),
    height: page.getHeight(),
    finalY: y,
  });

  return doc.save();
}
