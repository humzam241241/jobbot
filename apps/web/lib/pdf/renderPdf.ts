import { chromium, Browser } from "playwright";
import { wrapForPrint } from "./sanitize";
import { createLogger } from "@/lib/logger";
import { puppeteerHtmlToPdf, generateSimplePdf } from "./puppeteerRenderer";
import { generateDirectPdf } from "./directPdf";

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
    engine?: "direct" | "playwright" | "puppeteer";
  } = {}
): Promise<Buffer> {
  // Validate input
  if (!html || typeof html !== 'string') {
    logger.error('Invalid HTML provided to renderPdf', { type: typeof html });
    return generateSimplePdf('Content could not be rendered.', options.title || 'Document');
  }
  
  try {
    // Use the direct PDF generator by default
    const engine = options.engine || 'direct';
    logger.info(`Generating PDF using ${engine} engine`);
    
    if (engine === 'direct') {
      // Use the most reliable method first
      return await generateDirectPdf(html, options);
    }
    
    // Add default styling for other engines
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${options.title || "Document"}</title>
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
    
    // Try other engines if specified
    try {
      if (engine === 'puppeteer') {
        return await puppeteerHtmlToPdf(styledHtml, options);
      } else if (engine === 'playwright') {
        return await playwrightHtmlToPdf(styledHtml, options);
      } else {
        // Fallback to direct if unknown engine
        return await generateDirectPdf(html, options);
      }
    } catch (engineError) {
      logger.warn(`${engine} PDF generation failed, falling back to direct method`, { error: engineError });
      return await generateDirectPdf(html, options);
    }
  } catch (error) {
    logger.error('All PDF rendering methods failed', { error });
    
    // Return a simple error PDF
    return generateSimplePdf(`
      Error generating PDF. Please try again.
      
      Error details: ${error.message}
      
      Original content:
      ${html}
    `, `${options.title || "Document"} (Error)`);
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
