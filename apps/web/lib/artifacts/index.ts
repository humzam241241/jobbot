import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../logger';
import { marked } from 'marked';
import { renderPdf } from '../pdf/renderPdf';

const logger = createLogger('artifacts');

/**
 * Convert Markdown to HTML
 */
export function markdownToHtml(markdown: string): string {
  try {
    // Convert markdown to HTML
    const html = marked.parse(markdown);
    
    // Wrap in basic HTML structure with styling
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          h2 {
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          ul {
            margin-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
          p {
            margin-bottom: 15px;
          }
          .container {
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${html}
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    logger.error('Error converting markdown to HTML', { error });
    
    // Return simple HTML with the raw markdown as fallback
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>body { font-family: monospace; white-space: pre-wrap; }</style>
      </head>
      <body>
        <pre>${markdown}</pre>
      </body>
      </html>
    `;
  }
}

/**
 * Render markdown to PDF
 */
export async function renderMarkdownToPDF(
  markdown: string,
  options: { title?: string } = {}
): Promise<Buffer> {
  try {
    // Convert markdown to HTML
    const html = markdownToHtml(markdown);
    
    // Determine PDF engine
    const pdfEngine = process.env.RESUME_PDF_ENGINE || 'puppeteer';
    
    // Render PDF
    logger.info(`Rendering PDF using ${pdfEngine} engine`);
    const pdfBuffer = await renderPdf(html, {
      title: options.title || 'Document',
      engine: pdfEngine,
    });
    
    return pdfBuffer;
  } catch (error) {
    logger.error('Error rendering markdown to PDF', { error });
    throw error;
  }
}

/**
 * Save a file to the storage system
 */
export async function saveFile(
  content: Buffer | string,
  options: {
    mime: string;
    name: string;
    telemetryId?: string;
  }
): Promise<{ url: string; name: string }> {
  const storageProvider = process.env.STORAGE_PROVIDER || 'local';
  const telemetryId = options.telemetryId || uuidv4();
  
  try {
    logger.info(`Saving file using ${storageProvider} storage`, {
      mime: options.mime,
      name: options.name,
    });
    
    // Handle different storage providers
    switch (storageProvider) {
      case 'local':
        return saveLocalFile(content, options, telemetryId);
      
      // Add other storage providers here (S3, GCS, etc.)
      
      default:
        throw new Error(`Unsupported storage provider: ${storageProvider}`);
    }
  } catch (error) {
    logger.error('Error saving file', { error, options });
    throw error;
  }
}

/**
 * Save a file to local storage
 */
async function saveLocalFile(
  content: Buffer | string,
  options: { mime: string; name: string },
  telemetryId: string
): Promise<{ url: string; name: string }> {
  // Create directory structure
  const publicDir = path.join(process.cwd(), 'public');
  const generatedDir = path.join(publicDir, 'generated');
  const telemetryDir = path.join(generatedDir, telemetryId);
  
  // Ensure directories exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir);
  }
  if (!fs.existsSync(telemetryDir)) {
    fs.mkdirSync(telemetryDir);
  }
  
  // Create safe filename
  const safeFilename = options.name
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_{2,}/g, '_');
  
  // Create full path
  const filePath = path.join(telemetryDir, safeFilename);
  
  // Write file
  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(filePath, content);
  } else {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  // Generate URL
  const baseUrl = process.env.STORAGE_BASE_URL || 'http://localhost:3000';
  const url = `${baseUrl}/generated/${telemetryId}/${safeFilename}`;
  
  return {
    url,
    name: safeFilename,
  };
}
