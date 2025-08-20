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
  let browser;
  try {
    // Create a simple HTML document
    const html = `
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
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      }
    });
    
    return pdfBuffer;
  } catch (error) {
    logger.error('Simple PDF generation failed', { error });
    // Return a minimal PDF as bytes if all else fails
    return Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<<>>/Contents 4 0 R>>\nendobj\n4 0 obj<</Length 23>>stream\nBT /F1 12 Tf 100 700 Td (${title}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000053 00000 n\n0000000102 00000 n\n0000000182 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n254\n%%EOF`);
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
    }
  }
}
