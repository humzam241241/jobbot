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
    const fallbackHtml = '<html><body><h1>Document</h1><p>Content could not be rendered.</p></body></html>';
    return generateSimplePdf('Content could not be rendered.', options.title || 'Document');
  }
  
  try {
    // Default to puppeteer for reliability
    const engine = options.engine || 'puppeteer';
    logger.info(`Rendering PDF using ${engine} engine`);
    
    // Use appropriate engine
    switch (engine) {
      case 'playwright':
        try {
          return await playwrightHtmlToPdf(html, options);
        } catch (playwrightError) {
          logger.warn('Playwright PDF generation failed, falling back to Puppeteer', { error: playwrightError });
          return await puppeteerHtmlToPdf(html, options);
        }
      
      case 'puppeteer':
        return await puppeteerHtmlToPdf(html, options);
      
      default:
        logger.warn(`Unknown PDF engine: ${engine}, falling back to Puppeteer`);
        return await puppeteerHtmlToPdf(html, options);
    }
  } catch (error) {
    logger.error('PDF rendering failed with all engines', { error });
    
    try {
      // Create a simple error PDF
      return await generateSimplePdf(
        `There was an error rendering the PDF. Please try again or contact support if the issue persists.\n\nError details: ${error.message}`, 
        `${options.title || "Document"} (Error)`
      );
    } catch (fallbackError) {
      logger.error('All PDF generation methods failed', { 
        originalError: error,
        fallbackError 
      });
      
      // Last resort: return a text buffer with error info
      return Buffer.from(`PDF generation failed: ${error.message}`);
    }
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
