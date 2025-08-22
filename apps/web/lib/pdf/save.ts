import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';

type SaveArgs = {
  id: string;
  rewrittenJsonOrText: string; // JSON per prompt or clean text
  originalMarkdown: string;
};

// Very simple layout keeper: we keep the same sections and headings, place bullets, and hard-limit length.
export async function savePdf({ id, rewrittenJsonOrText, originalMarkdown }: SaveArgs) {
  const outDir = path.join(process.cwd(), 'public', 'resumes');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${id}.pdf`);
  const doc = new PDFDocument({ size:'LETTER', margins: { top:36, left:36, right:36, bottom:36 }});
  const stream = fs.createWriteStream(file);
  doc.pipe(stream);

  // Minimal parser: prefer JSON; fallback to text
  let data: any = null;
  try { data = JSON.parse(rewrittenJsonOrText); } catch {}

  doc.fontSize(14).text('Resume', { align:'left' }).moveDown(0.5);

  if (data?.summary) {
    doc.fontSize(10).text('SUMMARY', { underline:true }).moveDown(0.2);
    doc.fontSize(10).text(data.summary).moveDown(0.5);
  }
  if (Array.isArray(data?.experience)) {
    doc.fontSize(10).text('EXPERIENCE', { underline:true }).moveDown(0.2);
    for (const item of data.experience.slice(0,4)) {
      doc.fontSize(10).text(`${item.role ?? ''} • ${item.company ?? ''}`);
      for (const b of (item.bullets ?? []).slice(0,4)) doc.list([b], { bulletRadius:2 });
      doc.moveDown(0.3);
    }
  }
  if (Array.isArray(data?.projects)) {
    doc.fontSize(10).text('PROJECTS', { underline:true }).moveDown(0.2);
    for (const p of data.projects.slice(0,3)) {
      doc.fontSize(10).text(p.name ?? 'Project');
      for (const b of (p.bullets ?? []).slice(0,3)) doc.list([b], { bulletRadius:2 });
      doc.moveDown(0.3);
    }
  }
  if (Array.isArray(data?.skills)) {
    doc.fontSize(10).text('SKILLS', { underline:true }).moveDown(0.2);
    doc.text(data.skills.slice(0,20).join(' • '));
  }

  // Fallback when JSON missing: dump text
  if (!data) {
    doc.moveDown(0.5).fontSize(10).text(rewrittenJsonOrText);
  }

  doc.end();
  await new Promise((r)=> stream.on('finish', r));

  return { pdfUrl: `/resumes/${id}.pdf` };
}
