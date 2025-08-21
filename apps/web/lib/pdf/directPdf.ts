/**
 * Direct PDF generation using a simpler approach
 * This creates a PDF file directly with the HTML content
 */

import { logger } from '@/lib/logger';
import htmlPdf from 'html-pdf-node';

/**
 * Generate a PDF from HTML content
 */
export async function generateDirectPdf(
  html: string,
  options: { 
    title?: string;
    size?: "Letter" | "A4";
  } = {}
): Promise<Buffer> {
  try {
    logger.info('Generating PDF with html-pdf-node');
    
    // Prepare HTML with proper styling
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options.title || 'Document'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0.5in;
              line-height: 1.5;
            }
            h1 { 
              color: #2563eb;
              margin-bottom: 1em;
              font-size: 24pt;
            }
            h2 {
              color: #1e40af;
              margin-top: 1em;
              margin-bottom: 0.5em;
              font-size: 18pt;
            }
            p { margin: 0.5em 0; }
            ul { margin: 0.5em 0; padding-left: 1.5em; }
            li { margin: 0.25em 0; }
            .section { margin: 1em 0; }
            .experience-header { font-weight: bold; }
            .experience-subtitle { font-style: italic; color: #4a5568; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    
    // Set options for PDF generation
    const pdfOptions = {
      format: options.size || 'Letter',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
      preferCSSPageSize: true
    };
    
    // Generate PDF
    const file = { content: styledHtml };
    const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);
    
    logger.info(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    logger.error('Direct PDF generation failed', { error });
    
    // Return a simple HTML as fallback
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${options.title || 'Document'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2cm; }
            h1 { color: #e53e3e; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${options.title || 'Document'} (Error)</h1>
          <p>There was an error generating the PDF.</p>
          <pre>${html}</pre>
        </body>
      </html>
    `;
    
    return Buffer.from(fallbackHtml);
  }
}
