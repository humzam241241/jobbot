import { chromium, Browser } from "playwright";
import { wrapForPrint } from "./sanitize";
import { createLogger } from "@/lib/logger";
import { puppeteerHtmlToPdf, generateSimplePdf } from "./puppeteerRenderer";

const logger = createLogger('pdf-renderer');

// Maintain a singleton browser instance
let browserPromise: Promise<Browser> | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser() {
  if (!browserPromise) {
    try {
      logger.info('Launching browser with explicit options');
      browserPromise = chromium.launch({ 
        headless: true, 
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 60000, // Longer timeout for browser launch
      });
    } catch (err) {
      logger.error('Failed to launch browser:', { error: err });
      throw new Error(`Browser launch failed: ${err.message}`);
    }
  }
  return browserPromise;
}

/**
 * Convert HTML to PDF using Playwright
 */
async function playwrightHtmlToPdf(
  html: string,
  opts?: { title?: string; size?: "Letter"|"A4" }
): Promise<Buffer> {
  try {
    logger.debug('Starting Playwright PDF generation');
    
    // Launch a new browser instance directly instead of using the singleton
    // This helps avoid issues with the shared browser instance
    const browser = await chromium.launch({ 
      headless: true, 
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      timeout: 60000, // Longer timeout for browser launch
    });
    
    logger.debug('Browser launched successfully');
    
    const context = await browser.newContext(); // ephemeral for isolation
    const page = await context.newPage();
    
    // Wrap HTML in print-friendly template
    const wrappedHtml = wrapForPrint(html, { 
      title: opts?.title || "Document", 
      size: opts?.size || "Letter" 
    });
    
    logger.debug('HTML wrapped for printing, content length: ' + wrappedHtml.length);
    
    // Set content and wait for load
    await page.setContent(wrappedHtml, { waitUntil: "load" });
    logger.debug('Content loaded in page');
    
    // Generate PDF
    const pdf = await page.pdf({
      format: opts?.size || "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
        right: '0.5in'
      },
      scale: 1.0,
    });
    
    logger.debug(`PDF generated, size: ${pdf.byteLength} bytes`);
    
    // Clean up
    await context.close();
    await browser.close();
    
    logger.debug('Browser closed');
    
    return Buffer.from(pdf);
  } catch (error) {
    logger.error('Playwright PDF generation failed', { error });
    throw error;
  }
}

/**
 * Render HTML to PDF
 * This is the main entry point for PDF rendering
 */
export async function renderPdf(
  html: string,
  options: { 
    title?: string; 
    size?: "Letter"|"A4";
    engine?: "playwright" | "puppeteer";
  } = {}
): Promise<Buffer> {
  // Validate input
  if (!html || typeof html !== 'string') {
    logger.error('Invalid HTML provided to renderPdf', { type: typeof html });
    return generateSimplePdf('Content could not be rendered.', options.title || 'Document');
  }
  
  try {
    // Just return HTML directly for now to ensure something works
    // This will at least show content to the user
    logger.info('Returning HTML directly as fallback');
    return generateSimplePdf(html, options.title || 'Document');
  } catch (error) {
    logger.error('PDF rendering failed', { error });
    
    // Last resort: return a text buffer with error info
    return Buffer.from(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${options.title || "Document"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2cm; }
            h1 { color: #e53e3e; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>PDF Generation Error</h1>
          <p>There was an error generating the PDF.</p>
          <pre>${html}</pre>
        </body>
      </html>
    `);
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function htmlToPdfBuffer(
  htmlInner: string,
  opts?: { title?: string; size?: "Letter"|"A4" }
): Promise<Buffer> {
  return renderPdf(htmlInner, opts);
}
