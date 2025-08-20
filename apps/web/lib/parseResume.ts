import pdf from "pdf-parse";
import mammoth from "mammoth";
export async function parseResumeFile(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file as any).name?.toLowerCase?.() || "upload";
  if (name.endsWith(".pdf")) { const out = await pdf(buf); return (out.text||"").trim(); }
  if (name.endsWith(".docx")) { const out = await mammoth.extractRawText({buffer:buf}); return (out.value||"").trim(); }
  return buf.toString("utf8").trim();
}
