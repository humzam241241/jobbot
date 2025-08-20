import { chromium, Browser } from "playwright";
import { wrapForPrint } from "./sanitize";
import { createLogger } from "@/lib/logger";

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
    const browser = await getBrowser();
    const context = await browser.newContext(); // ephemeral for isolation
    const page = await context.newPage();
    
    // Wrap HTML in print-friendly template
    const wrappedHtml = wrapForPrint(html, { 
      title: opts?.title || "Document", 
      size: opts?.size || "Letter" 
    });
    
    // Set content and wait for load
    await page.setContent(wrappedHtml, { waitUntil: "load" });
    
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
    
    // Clean up
    await context.close();
    
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
    return Buffer.from(fallbackHtml);
  }
  
  try {
    // Determine rendering engine
    const engine = options.engine || 'playwright';
    logger.info(`Rendering PDF using ${engine} engine`);
    
    // Use appropriate engine
    switch (engine) {
      case 'playwright':
        return await playwrightHtmlToPdf(html, options);
      
      case 'puppeteer':
        // For now, just use Playwright
        // In the future, this could be implemented with Puppeteer
        return await playwrightHtmlToPdf(html, options);
      
      default:
        logger.warn(`Unknown PDF engine: ${engine}, falling back to Playwright`);
        return await playwrightHtmlToPdf(html, options);
    }
  } catch (error) {
    logger.error('PDF rendering failed', { error });
    
    // Return fallback HTML as buffer
    return Buffer.from(`
      <html>
        <body>
          <h1>${options.title || "Document"}</h1>
          <div>${html}</div>
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
