"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownToPlain = markdownToPlain;
exports.writePdfFromMarkdown = writePdfFromMarkdown;
const fs_1 = __importDefault(require("fs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
function markdownToPlain(text) {
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
function writePdfFromMarkdown(md, outPath) {
    const doc = new pdfkit_1.default({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const stream = fs_1.default.createWriteStream(outPath);
    doc.pipe(stream);
    const text = markdownToPlain(md);
    const lines = text.split('\n');
    doc.font('Helvetica-Bold').fontSize(18).text(lines[0] || 'Generated Document', { align: 'left' });
    doc.moveDown();
    doc.font('Helvetica').fontSize(11);
    lines.slice(1).forEach(line => {
        if (line.trim() === '') {
            doc.moveDown(0.5);
        }
        else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            // Handle bullet points in a more sophisticated way in the future
            doc.text(line, { align: 'left' });
        }
        else {
            doc.text(line, { align: 'left' });
        }
    });
    doc.end();
    return new Promise((resolve) => stream.on('finish', () => resolve()));
}
