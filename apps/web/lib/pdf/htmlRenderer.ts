import { jsPDF } from 'jspdf';
import { logger } from '@/lib/logger';

/**
 * Convert HTML to PDF using jsPDF
 */
export async function htmlToPdf(
  html: string,
  options: { 
    title?: string;
    size?: "Letter" | "A4";
  } = {}
): Promise<Buffer> {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      format: options.size || 'Letter',
      unit: 'pt'
    });

    // Set title
    doc.setProperties({
      title: options.title || 'Document'
    });

    // Add content
    doc.html(html, {
      callback: function(pdf) {
        // PDF is ready
      },
      x: 36, // 0.5 inch margin
      y: 36,
      width: doc.internal.pageSize.getWidth() - 72, // 1 inch total margin
      windowWidth: 1024 // Reference width for scaling
    });

    // Get the PDF as a Buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    logger.info(`Generated PDF successfully, size: ${pdfBuffer.length} bytes`);
    
    return pdfBuffer;
  } catch (error) {
    logger.error('PDF generation failed', { error });
    throw error;
  }
}
