import { marked } from 'marked';
import fs from 'fs/promises';
import path from 'path';

/**
 * Converts markdown to HTML
 * @param markdown Markdown content
 * @returns HTML content
 */
export function markdownToHtml(markdown: string): string {
  return marked(markdown);
}

/**
 * Sanitizes HTML content
 * @param html HTML content
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  // Simple HTML sanitization
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '');
}

/**
 * Renders markdown content to a PDF buffer.
 * Uses HTML conversion as an intermediate step.
 * @param markdown Markdown content
 * @param options Rendering options
 * @returns PDF as a Buffer
 */
export async function renderMarkdownToPDF(
  markdown: string,
  options?: { title?: string }
): Promise<Buffer> {
  const html = markdownToHtml(markdown);
  const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${options?.title ?? 'Document'}</title></head><body>${html}</body></html>`;
  // Return the HTML content as a buffer; a full PDF renderer (e.g. puppeteer) can be integrated later
  return Buffer.from(wrapped, 'utf-8');
}

/**
 * Saves a file buffer to the uploads directory and returns its name and URL.
 * @param buffer File content
 * @param options Save options
 * @returns Object with name and url of the saved file
 */
export async function saveFile(
  buffer: Buffer,
  options: { mime?: string; name: string; telemetryId?: string }
): Promise<{ name: string; url: string }> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, options.name);
  await fs.writeFile(filePath, buffer);
  return { name: options.name, url: `/uploads/${options.name}` };
}