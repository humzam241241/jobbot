import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { kitStore } from "@/lib/kitStore";

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const data = kitStore.get(params.id);
  if (!data) return NextResponse.json({ error: "Not found or expired" }, { status: 404 });

  const doc = new PDFDocument({ size: "LETTER", margin: 48 });
  const chunks: Uint8Array[] = [];
  doc.on("data", c => chunks.push(c));
  const done = new Promise<Buffer>(res => doc.on("end", () => res(Buffer.concat(chunks))));

  const r = data.tailoredResume;
  doc.fontSize(20).text(r?.name ?? "Resume", { underline: true });
  doc.moveDown(0.5);
  if (r?.contact?.email) doc.fontSize(10).text(`Email: ${r.contact.email}`);
  if (r?.contact?.phone) doc.text(`Phone: ${r.contact.phone}`);
  if (r?.contact?.location) doc.text(`Location: ${r.contact.location}`);
  doc.moveDown();

  if (r?.summary) { doc.fontSize(12).text(r.summary); doc.moveDown(); }

  if (r?.skills?.length) {
    doc.fontSize(12).text("Skills", { underline: true }); doc.moveDown(0.3);
    doc.fontSize(10).list(r.skills); doc.moveDown();
  }

  if (r?.experience?.length) {
    doc.fontSize(12).text("Experience", { underline: true }); doc.moveDown(0.3);
    for (const e of r.experience) {
      doc.fontSize(11).text(`${e.role ?? ""} — ${e.company ?? ""}`);
      if (e.dates) doc.fontSize(9).text(e.dates);
      if (e.bullets?.length) doc.fontSize(10).list(e.bullets);
      doc.moveDown(0.5);
    }
  }

  if (data.coverLetter?.text) {
    doc.addPage();
    doc.fontSize(16).text("Cover Letter", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(data.coverLetter.text);
  }

  doc.end();
  const pdf = await done;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${params.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
