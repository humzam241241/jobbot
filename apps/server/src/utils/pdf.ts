import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export function markdownToPlain(text: string): string {
  // Simple naive markdown stripper for prototype
  return text
    .replace(/^#\s+/gm, '')
    .replace(/^##\s+/gm, '')
    .replace(/^###\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[(.*?)\]\([^)]+\)/g, '$1');
}

export function writePdfFromMarkdown(md: string, outPath: string) {
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const text = markdownToPlain(md);
  const lines = text.split('\n');

  doc.font('Helvetica-Bold').fontSize(18).text(lines[0] || 'Generated Document', { align: 'left' });
  doc.moveDown();

  doc.font('Helvetica').fontSize(11);
  lines.slice(1).forEach(line => {
    if (line.trim() === '') {
      doc.moveDown(0.5);
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      // Handle bullet points in a more sophisticated way in the future
      doc.text(line, { align: 'left' });
    } else {
      doc.text(line, { align: 'left' });
    }
  });

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', () => resolve()));
}
