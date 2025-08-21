/**
 * Server-side PDF generation using puppeteer-core
 * This is a more reliable approach than html-pdf-node
 */

import { logger } from '@/lib/logger';
import puppeteer from 'puppeteer-core';
import chrome from 'chrome-aws-lambda';

// Keep track of the browser instance
let browserPromise: Promise<puppeteer.Browser> | null = null;

/**
 * Generate a PDF from HTML content using puppeteer-core
 */
export async function generateServerPdf(
  html: string,
  options: { 
    title?: string;
    size?: "Letter" | "A4";
  } = {}
): Promise<Buffer> {
  try {
    logger.info('Generating PDF with puppeteer-core');
    
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
    
    // Launch browser if not already launched
    if (!browserPromise) {
      browserPromise = (async () => {
        try {
          // Try to use chrome-aws-lambda for environments like Vercel
          const executablePath = await chrome.executablePath;
          
          if (executablePath) {
            return puppeteer.launch({
              args: chrome.args,
              executablePath,
              headless: true,
            });
          } else {
            // Fallback to locally installed Chrome
            return puppeteer.launch({
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              executablePath: 
                process.platform === 'win32'
                  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                  : process.platform === 'linux'
                  ? '/usr/bin/google-chrome'
                  : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            });
          }
        } catch (error) {
          logger.error('Failed to launch browser', { error });
          throw error;
        }
      })();
    }
    
    // Get browser instance
    const browser = await browserPromise;
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(styledHtml, { waitUntil: 'networkidle0' });
    
    // Set PDF options
    const pdfOptions: puppeteer.PDFOptions = {
      format: options.size === 'A4' ? 'a4' : 'letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    };
    
    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);
    
    // Close the page (but keep the browser instance)
    await page.close();
    
    logger.info(`Server PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    logger.error('Server PDF generation failed', { error });
    
    // Return a simple text buffer as fallback
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
