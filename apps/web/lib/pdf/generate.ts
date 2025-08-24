import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-generator');

interface PdfOptions {
  content: string;
  title?: string;
  maxPages?: number;
  fontSize?: number;
}

/**
 * Generate a PDF from content
 */
export async function generatePdf(options: PdfOptions): Promise<{ buffer: Buffer; filePath: string }> {
  const { content, title = 'Document', maxPages = 1, fontSize = 11 } = options;
  
  try {
    // Create output directory
    const outDir = path.join(process.cwd(), 'public', 'generated');
    fs.mkdirSync(outDir, { recursive: true });
    
    // Create unique filename
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().slice(0, 8)}.pdf`;
    const filePath = path.join(outDir, filename);
    
    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'LETTER',
      info: {
        Title: title,
        CreationDate: new Date()
      }
    });
    
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(Boolean);
    
    // Set default font and size
    doc.font('Helvetica');
    doc.fontSize(fontSize);
    
    // Add title
    doc.font('Helvetica-Bold').fontSize(fontSize + 4).text(title, { align: 'center' });
    doc.moveDown(2);
    
    // Add content
    doc.font('Helvetica');
    paragraphs.forEach(paragraph => {
      doc.fontSize(fontSize).text(paragraph.trim(), { align: 'left' });
      doc.moveDown(1);
    });
    
    // Finalize PDF
    const buffer = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });
    
    // Save to file
    fs.writeFileSync(filePath, buffer);
    
    logger.info('PDF generated successfully', { filePath });
    
    return {
      buffer,
      filePath: `/generated/${filename}`
    };
  } catch (error) {
    logger.error('Error generating PDF', { error });
    throw error;
  }
}