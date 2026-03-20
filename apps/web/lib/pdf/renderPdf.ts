import { wrapForPrint } from "./sanitize";
import { createLogger } from "@/lib/logger";
import { puppeteerHtmlToPdf, generateSimplePdf } from "./puppeteerRenderer";
import { generateDirectPdf } from "./directPdf";
import { generateServerPdf } from "./serverPdf";

const logger = createLogger('pdf-renderer');

/**
 * Lazily import playwright — only when actually needed at runtime.
 * This prevents the Vercel build from failing due to missing playwright binaries.
 */
async function lazyPlaywright() {
  const { chromium } = await import("playwright");
  return chromium;
}

// Maintain a singleton browser instance
let browserPromise: Promise<any> | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser() {
  if (!browserPromise) {
    try {
      logger.info('Launching browser with explicit options');
      const chromium = await lazyPlaywright();
      browserPromise = chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        timeout: 60000, // Longer timeout for browser launch
      });
    } catch (err: any) {
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
    const chromium = await lazyPlaywright();
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
    engine?: "server" | "direct" | "playwright" | "puppeteer" | "client";
  } = {}
): Promise<Buffer> {
  // Validate input
  if (!html || typeof html !== 'string') {
    logger.error('Invalid HTML provided to renderPdf', { type: typeof html });
    return generateSimplePdf('Content could not be rendered.', options.title || 'Document');
  }
  
  try {
    // Use the server PDF generator by default
    const engine = options.engine || 'server';
    logger.info(`Generating PDF using ${engine} engine`);
    
    // Try the requested engine
    try {
      if (engine === 'server') {
        // Use our most reliable server-side method first
        return await generateServerPdf(html, options);
      } else if (engine === 'direct') {
        return await generateDirectPdf(html, options);
      } else if (engine === 'puppeteer') {
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
        return await puppeteerHtmlToPdf(styledHtml, options);
      } else if (engine === 'playwright') {
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
                h1 { color: #2563eb; }
                h2 { color: #1e40af; }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;
        return await playwrightHtmlToPdf(styledHtml, options);
      } else if (engine === 'client') {
        // Client-side rendering is handled differently - just return HTML as buffer
        // The client will convert it to PDF
        const styledHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${options.title || "Document"}</title>
              <meta name="pdf-engine" content="client">
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;
        return Buffer.from(styledHtml);
      } else {
        // Fallback to server if unknown engine
        return await generateServerPdf(html, options);
      }
    } catch (engineError) {
      logger.warn(`${engine} PDF generation failed, trying server method`, { error: engineError });
      try {
        return await generateServerPdf(html, options);
      } catch (serverError) {
        logger.warn('Server PDF generation failed, trying direct method', { error: serverError });
        try {
          return await generateDirectPdf(html, options);
        } catch (directError) {
          logger.warn('Direct PDF generation failed, using simple PDF', { error: directError });
          throw directError;
        }
      }
    }
  } catch (error) {
    logger.error('All PDF rendering methods failed', { error });
    
    // Return a simple error PDF
    return generateSimplePdf(`
      Error generating PDF. Please try again.
      
      Error details: ${error.message}
      
      Original content:
      ${html.substring(0, 500)}...
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
