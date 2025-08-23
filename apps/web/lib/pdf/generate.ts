import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import PDFDocument from "pdfkit";
import MarkdownIt from "markdown-it";
import { createLogger } from '@/lib/logger';
import { prepareFonts } from './fonts';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

const logger = createLogger('pdf-generator');
const md = new MarkdownIt();

function ensureOutDir() {
  const out = path.join(process.cwd(), "public", "generated");
  fs.mkdirSync(out, { recursive: true });
  
  // Clean up old files (keep last 100)
  try {
    const files = fs.readdirSync(out)
      .map(file => ({
        name: file,
        path: path.join(out, file),
        mtime: fs.statSync(path.join(out, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    files.slice(100).forEach(file => {
      try {
        fs.unlinkSync(file.path);
        logger.info('Cleaned up old file', { file: file.name });
      } catch (e) {
        logger.warn('Failed to delete old file', { file: file.name, error: e });
      }
    });
  } catch (e) {
    logger.error('Error cleaning up old files', { error: e });
  }

  return out;
}

function writeMarkdownDocx(markdown: string, filename: string) {
  const outDir = ensureOutDir();
  const full = path.join(outDir, filename);
  logger.info('Writing DOCX', { filename });

  const html = md.render(markdown);
  const stripped = html
    .replace(/<[^>]+>/g, "")
    .replace(/\&nbsp;/g, " ")
    .trim();

  const paragraphs: Paragraph[] = [];
  const lines = stripped.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      paragraphs.push(new Paragraph(""));
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      const level = (line.match(/^(#{1,6})\s/)?.[1].length || 1) as 1|2|3|4|5|6;
      const text = line.replace(/^#{1,6}\s/, '');
      const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
      paragraphs.push(new Paragraph({ text, heading: headingLevel }));
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s+/, '');
      paragraphs.push(new Paragraph({ children: [ new TextRun({ text: `• ${content}` }) ] }));
      continue;
    }
    paragraphs.push(new Paragraph({ children: [ new TextRun({ text: line }) ] }));
  }

  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const bufferPromise = Packer.toBuffer(doc);
  const bufSyncWrite = (buf: Buffer) => {
    fs.writeFileSync(full, buf);
  };
  return bufferPromise.then((buf) => {
    bufSyncWrite(buf as Buffer);
    logger.info('Successfully wrote DOCX', { path: full });
    return { path: full, url: `/generated/${filename}` };
  });
}

function writeMarkdownPdf(markdown: string, filename: string) {
  const outDir = ensureOutDir();
  const full = path.join(outDir, filename);

  logger.info('Writing PDF', { filename });

  try {
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'LETTER',
      info: {
        Title: filename.replace('.pdf', ''),
        CreationDate: new Date()
      }
    });

    const stream = fs.createWriteStream(full);
    doc.pipe(stream);

    // Initialize fonts
    const { useFont } = prepareFonts(doc);
    logger.info('[pdf] PDF font pipeline initialized');

    // Convert markdown to HTML and strip tags for ATS-friendly text
    const html = md.render(markdown);
    const stripped = html
      .replace(/<[^>]+>/g, "") // strip tags
      .replace(/\&nbsp;/g, " ")
      .trim();

    // Helper functions for consistent text styling
    function h1(text: string) { 
      useFont('bold'); 
      doc.fontSize(16).text(text); 
      useFont('regular');
    }

    function h2(text: string) {
      useFont('bold');
      doc.fontSize(14).text(text);
      useFont('regular');
    }

    function p(text: string) {
      useFont('regular');
      doc.fontSize(11).text(text);
    }

    function bullet(text: string) {
      useFont('regular');
      doc.fontSize(11).text(text, { indent: 20 });
    }

    // Process each line
    stripped.split("\n").forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.5);
        return;
      }

      // Handle headings
      if (trimmed.match(/^#{1,6}\s/)) {
        const level = trimmed.match(/^(#{1,6})\s/)?.[1].length || 1;
        const text = trimmed.replace(/^#{1,6}\s/, '');
        if (level === 1) {
          h1(text);
        } else {
          h2(text);
        }
        doc.moveDown(0.5);
        return;
      }

      // Handle bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        bullet(trimmed);
        return;
      }

      // Regular text
      p(trimmed);
    });

    doc.end();

    logger.info('Successfully wrote PDF', { path: full });

    return { 
      path: full, 
      url: `/generated/${filename}` 
    };
  } catch (error) {
    logger.error('Error writing PDF', { error, filename });
    throw error;
  }
}

export function generateResumeKitPdfs(args: {
  resume_markdown: string;
  cover_letter_markdown: string;
  ats_report: {
    score: number;
    matched_keywords: string[];
    missing_keywords: string[];
    notes: string[];
  };
}) {
  logger.info('Generating resume kit PDFs');

  try {
    const id = uuidv4().slice(0, 8);

    // Generate resume PDF
    const resume = writeMarkdownPdf(args.resume_markdown, `resume-${id}.pdf`);

    // Generate cover letter PDF
    const cover = writeMarkdownPdf(args.cover_letter_markdown, `cover-letter-${id}.pdf`);

    // Generate ATS report PDF
    const atsLines: string[] = [];
    atsLines.push(`# ATS Report`);
    atsLines.push(`Score: ${Math.round(args.ats_report.score)}/100`);
    atsLines.push(``);
    atsLines.push(`## Matched Keywords`);
    atsLines.push(args.ats_report.matched_keywords.join(", ") || "—");
    atsLines.push(``);
    atsLines.push(`## Missing Keywords`);
    atsLines.push(args.ats_report.missing_keywords.join(", ") || "—");
    atsLines.push(``);
    atsLines.push(`## Notes`);
    if (args.ats_report.notes?.length) {
      args.ats_report.notes.forEach(n => atsLines.push(`- ${n}`));
    } else {
      atsLines.push("—");
    }

    const ats = writeMarkdownPdf(atsLines.join("\n"), `ats-report-${id}.pdf`);

    logger.info('Successfully generated all PDFs', {
      resumePath: resume.path,
      coverPath: cover.path,
      atsPath: ats.path
    });

    // Generate DOCX files alongside PDFs
    const resumeDocxPromise = writeMarkdownDocx(args.resume_markdown, `resume-${id}.docx`);
    const coverDocxPromise = writeMarkdownDocx(args.cover_letter_markdown, `cover-letter-${id}.docx`);
    const atsDocxPromise = writeMarkdownDocx(atsLines.join("\n"), `ats-report-${id}.docx`);

    return Promise.all([resumeDocxPromise, coverDocxPromise, atsDocxPromise]).then(([resumeDocx, coverDocx, atsDocx]) => {
      return {
        resumePdfUrl: resume.url,
        coverLetterPdfUrl: cover.url,
        atsReportPdfUrl: ats.url,
        resumeDocxUrl: resumeDocx.url,
        coverLetterDocxUrl: coverDocx.url,
        atsReportDocxUrl: atsDocx.url
      };
    });
  } catch (error) {
    logger.error('Error generating PDFs', { error });
    throw error;
  }
}