import fs from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer';
import { createLogger } from '@/lib/logger';
import { PDFGenerationError, withPdfErrorHandling, retryWithBackoff } from './errorHandling';

const logger = createLogger('server-renderer');

// Keep track of the browser instance
let browserPromise: Promise<puppeteer.Browser> | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        return puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      } catch (error) {
        logger.error('Failed to launch browser', { error });
        throw error;
      }
    })();
  }
  
  return browserPromise;
}

/**
 * Generate a PDF from HTML content
 */
export async function generatePdfFromHtml(
  html: string,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  return withPdfErrorHandling(async () => {
    logger.info('Generating PDF from HTML', { 
      options
    });
    
    // Wrap in a complete HTML document with doctype and meta tags
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options.title || 'Document'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0.5in;
              line-height: 1.5;
              color: #000;
              background: #fff;
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
    
    // Get browser instance with retry
    const browser = await retryWithBackoff(
      () => getBrowser(),
      {
        maxRetries: 3,
        component: 'browser-launch',
        initialDelayMs: 1000
      }
    ).catch((error) => {
      throw new PDFGenerationError('Failed to launch browser for PDF generation', {
        code: 'BROWSER_LAUNCH_ERROR',
        component: 'puppeteer',
        cause: error
      });
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set content with a longer timeout
    await page.setContent(wrappedHtml, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Set PDF options
    const pdfOptions: puppeteer.PDFOptions = {
      format: options.size === 'A4' ? 'a4' : 'letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      timeout: 30000
    };
    
    // Generate PDF with retry
    const pdfBuffer = await retryWithBackoff(
      () => page.pdf(pdfOptions),
      {
        maxRetries: 2,
        component: 'pdf-generation',
        initialDelayMs: 500
      }
    ).catch((error) => {
      throw new PDFGenerationError('Failed to generate PDF from HTML', {
        code: 'PDF_CONVERSION_ERROR',
        component: 'puppeteer-pdf',
        cause: error
      });
    });
    
    // Close the page (but keep the browser instance)
    await page.close();
    
    // Save to file if requested
    let filePath: string | undefined;
    if (options.saveToPath) {
      const fileName = options.fileName || `document_${Date.now()}.pdf`;
      const publicDir = path.join(process.cwd(), 'public', 'resumes');
      
      try {
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        
        // Make the path relative to public directory for URL access
        filePath = `/resumes/${fileName}`;
      } catch (fsError: any) {
        throw new PDFGenerationError('Failed to save PDF to file system', {
          code: 'FILE_SYSTEM_ERROR',
          component: 'file-system',
          details: { filePath, fileName },
          cause: fsError
        });
      }
      
      logger.info(`PDF saved to ${filePath}`);
    }
    
    logger.info(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return { buffer: pdfBuffer, filePath };
  }, {
    component: 'server-renderer',
    fallback: { buffer: Buffer.from('PDF generation failed'), filePath: undefined }
  });
}