import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export type ResumeFile = {
  buffer: Buffer;
  mime?: string;
  name?: string;
};

export async function extractResumeText(file: ResumeFile): Promise<string> {
  const name = (file.name || "").toLowerCase();
  const mime = (file.mime || "").toLowerCase();

  // DOCX → HTML → plain text
  if (name.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const { value: html } = await mammoth.convertToHtml({ buffer: file.buffer });
    const text = html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 50) return text;
  }

  // PDF
  if (name.endsWith(".pdf") || mime.includes("pdf")) {
    const res = await pdfParse(file.buffer);
    const text = (res.text || "").replace(/\s+\n/g, "\n").trim();
    if (text.length > 50) return text;
  }

  // TXT / fallback
  const utf8 = file.buffer.toString("utf8").trim();
  if (utf8.length > 20) return utf8;

  throw new Error("Unable to extract text from resume file");
}
