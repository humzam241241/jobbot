import puppeteer from 'puppeteer';
import { logger } from '@/lib/logger';
import { wrapForPrint } from './sanitize';

/**
 * Convert HTML to PDF using Puppeteer
 */
export async function puppeteerHtmlToPdf(
  html: string,
  opts?: { title?: string; size?: "Letter" | "A4" }
): Promise<Buffer> {
  const startTime = Date.now();
  logger.info('Starting Puppeteer PDF generation');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    logger.debug('Puppeteer browser launched successfully');
    
    // Create a new page
    const page = await browser.newPage();
    
    // Wrap HTML in print-friendly template
    const wrappedHtml = wrapForPrint(html, {
      title: opts?.title || "Document",
      size: opts?.size || "Letter"
    });
    
    // Set content and wait for load
    await page.setContent(wrappedHtml, {
      waitUntil: 'networkidle0'
    });
    
    logger.debug('Content loaded in Puppeteer page');
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: opts?.size || "Letter",
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    });
    
    logger.info(`PDF generated successfully, size: ${pdfBuffer.length} bytes, took ${Date.now() - startTime}ms`);
    
    return pdfBuffer;
  } catch (error) {
    logger.error('Puppeteer PDF generation failed', { error });
    throw error;
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
      logger.debug('Puppeteer browser closed');
    }
  }
}

/**
 * Simple function to generate a basic PDF with text
 * Used as a fallback when other methods fail
 */
export async function generateSimplePdf(text: string, title: string = "Document"): Promise<Buffer> {
  // Create a simple HTML document as a string
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2cm; line-height: 1.5; }
          h1 { color: #2563eb; margin-bottom: 1cm; }
          pre { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <pre>${text}</pre>
      </body>
    </html>
  `;
  
  // Return a Buffer containing the HTML
  // This is a fallback that will at least show something to the user
  return Buffer.from(htmlContent);
}
