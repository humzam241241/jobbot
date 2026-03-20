// apps/web/lib/pdf/serverRenderer.ts
import "server-only";

// Import only the type, not the actual implementation
import type { ReactNode } from 'react';
import type puppeteerType from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

/**
 * Server-only component that renders React elements to HTML strings.
 * This is safe to use in server components but should never be imported by client code.
 */
export async function renderReactToHtml(element: ReactNode): Promise<string> {
  try {
    // Dynamic import is only evaluated at runtime on the server
    const { renderToStaticMarkup } = await import('react-dom/server');
    return renderToStaticMarkup(element as any);
  } catch (error) {
    console.error("Failed to render React element to HTML:", error);
    return `<pre>Error rendering component</pre>`;
  }
}

/**
 * Generate a PDF from HTML
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
  // Wrap in a complete HTML document with doctype and meta tags
  const wrappedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${options.title || 'Document'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
  
  // Launch browser (lazy import to avoid bundling puppeteer at build time)
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(wrappedHtml, { waitUntil: 'networkidle0' });
    
    // Set PDF options
    const pdfOptions: puppeteerType.PDFOptions = {
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
    
    // Save to file if requested
    let filePath: string | undefined;
    if (options.saveToPath) {
      const fileName = options.fileName || `document_${Date.now()}.pdf`;
      const publicDir = path.join(process.cwd(), 'public', 'resumes');
      
      // Create directory if it doesn't exist
      await fs.mkdir(publicDir, { recursive: true });
      
      filePath = path.join(publicDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);
    }
    
    return { buffer: pdfBuffer, filePath };
  } finally {
    await browser.close();
  }
}