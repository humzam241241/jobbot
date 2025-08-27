import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, copyFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function POST(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Try to parse JSON body for job description and options
    let jobDescription = '';
    try {
      const json = await request.json();
      if (json?.jobDescription && typeof json.jobDescription === 'string') {
        jobDescription = json.jobDescription;
      }
    } catch {}

    // If DB lookup fails for any reason, continue in filesystem-only mode
    try {
      const kit = await prisma.kit.findUnique({ where: { id: params.kitId } });
      if (!kit) console.warn('Kit not found in DB; generating files anyway:', params.kitId);
    } catch (e) {
      console.warn('Prisma findUnique failed; continuing without DB:', e);
    }

    // Minimal placeholder generation: copy source.docx into outputs
    const uploadDir = path.join(process.cwd(), 'uploads', params.kitId);
    try {
      await writeFile(path.join(uploadDir, '.keep'), new Uint8Array());
    } catch {
      // Create directory tree if it does not exist
      try {
        const { mkdir } = await import('fs/promises');
        await mkdir(uploadDir, { recursive: true });
      } catch {}
    }
    const sourcePath = path.join(uploadDir, 'source.docx');
    let resumeText = '';
    try {
      const sourceBuf: Buffer = await readFile(sourcePath);
      // Extract text from DOCX to use in tailoring
      const { value } = await mammoth.extractRawText({ buffer: sourceBuf });
      resumeText = (value || '').trim();
      // Keep a DOCX copy as a placeholder tailored docx for now
      await copyFile(sourcePath, path.join(uploadDir, 'resume_tailored.docx'));
    } catch (e) {
      console.warn('Source not found or read failed:', e);
    }

    // Very simple keyword extraction from job description
    const jd = jobDescription || 'Job description not provided.';
    const stop = new Set(['the','a','an','and','or','to','of','in','for','with','on','at','by','from','as','is','are','be','this','that','your']);
    const words = jd.toLowerCase().match(/[a-z0-9]+/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) { if (!stop.has(w) && w.length > 2) freq[w] = (freq[w]||0)+1; }
    const keywords = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,12);

    // Compose simple HTML documents
    const resumeHtml = `
      <div class="professional-format">
        <h1>Tailored Resume</h1>
        <h2>Summary</h2>
        <p>Experienced candidate tailored for this role. Focus areas: ${keywords.join(', ') || 'general qualifications'}.</p>
        <h2>Key Highlights</h2>
        <ul>${keywords.map(k=>`<li>${k}</li>`).join('')}</ul>
        <h2>Original Resume Extract</h2>
        <p>${(resumeText || 'N/A').replace(/\n/g,'<br/>')}</p>
      </div>`;

    const coverHtml = `
      <div class="professional-format">
        <h1>Cover Letter</h1>
        <p>Dear Hiring Manager,</p>
        <p>I am excited to apply for this opportunity. My experience strongly aligns with ${keywords.slice(0,5).join(', ') || 'the requirements'}.</p>
        <p>${jd.replace(/\n/g,'<br/>')}</p>
        <p>Thank you for your consideration.</p>
      </div>`;

    const atsHtml = `
      <div class="professional-format">
        <h1>ATS Compatibility Report</h1>
        <h2>Top Keywords</h2>
        <ul>${keywords.map(k=>`<li>${k}</li>`).join('')}</ul>
        <h2>Notes</h2>
        <p>Ensure these terms are present and emphasized in the resume content to maximize ATS parsing.</p>
      </div>`;

    // Generate PDFs from HTML using html-pdf-node
    // Render real PDFs using pdf-lib
    async function renderPdfFromHtmlLike(content: string, outName: string) {
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const margin = 50;
      const maxWidth = width - margin * 2;

      // Naive word-wrapping for plain text from HTML-like content
      const text = content
        .replace(/<[^>]+>/g, ' ') // strip tags
        .replace(/&nbsp;/g, ' ') // common entity
        .replace(/\s+/g, ' ') // collapse spaces
        .trim();

      const words = text.split(' ');
      let y = height - margin;
      let line = '';

      function drawLine(l: string) {
        page.drawText(l, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= fontSize + 4;
      }

      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        const widthTest = font.widthOfTextAtSize(test, fontSize);
        if (widthTest > maxWidth) {
          drawLine(line);
          line = w;
        } else {
          line = test;
        }
        if (y < margin) {
          // new page when overflow
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - margin;
        }
      }
      if (line) drawLine(line);

      const pdfBytes = await pdfDoc.save();
      await writeFile(path.join(uploadDir, outName), pdfBytes);
    }

    // Render minimal DOCX using docx library
    async function renderDocxFromText(content: string, outName: string) {
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split(/\n+/).map(p => new Paragraph({ children: [new TextRun(p)] })),
        }],
      });
      const buffer = await Packer.toBuffer(doc);
      await writeFile(path.join(uploadDir, outName), buffer);
    }

    try {
      await renderPdfFromHtmlLike(resumeHtml, 'resume_tailored.pdf');
      await renderPdfFromHtmlLike(coverHtml, 'cover_letter.pdf');
      await renderPdfFromHtmlLike(atsHtml, 'ats_report.pdf');
    } catch (e) {
      console.warn('Failed to render PDFs:', e);
    }

    // Create DOCX versions of all artifacts as well
    try {
      await renderDocxFromText(resumeHtml.replace(/<[^>]+>/g,'\n'), 'resume_tailored.docx');
      await renderDocxFromText(coverHtml.replace(/<[^>]+>/g,'\n'), 'cover_letter.docx');
      await renderDocxFromText(atsHtml.replace(/<[^>]+>/g,'\n'), 'ats_report.docx');
    } catch (e) {
      console.warn('Failed to render DOCX:', e);
    }

    // Return 6 artifacts: 2 resumes, 2 cover letters, 2 ATS reports in PDF/DOCX
    const fileList = [
      'resume_tailored.docx', 'resume_tailored.pdf',
      'cover_letter.docx', 'cover_letter.pdf',
      'ats_report.docx', 'ats_report.pdf'
    ];

    // Write a simple manifest so the results page can reliably list outputs
    try {
      await writeFile(
        path.join(uploadDir, 'manifest.json'),
        JSON.stringify({ files: fileList }, null, 2)
      );
    } catch (e) {
      console.warn('Failed to write manifest.json:', e);
    }

    let kitId = params.kitId;
    try {
      const updated = await prisma.kit.update({
        where: { id: params.kitId },
        data: { status: 'completed', files: JSON.stringify(fileList) }
      });
      kitId = updated.id;
    } catch (e) {
      console.warn('Prisma update failed; returning filesystem result only:', e);
    }

    return NextResponse.json({ success: true, files: fileList, kitId });
  } catch (error) {
    console.error('Error generating kit:', error);
    return NextResponse.json(
      { error: 'Failed to generate kit' },
      { status: 500 }
    );
  }
}