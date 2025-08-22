import { marked } from 'marked';

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