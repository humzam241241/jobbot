import path from "path";
import fs from "fs";
import { createTraceId, logDebug } from "./trace";
import { parsePdf } from "./parsePdf";
import { parseDocx } from "./parseDocx";
import { normalize } from "./normalize";
import { tailor } from "./ai/tailor";
import { resumeHtml, coverLetterHtml } from "./render/htmlTemplate";
import { htmlToPdf } from "./export/toPdf";
import { resumeToDocx, coverToDocx } from "./export/toDocx";
import type { ResumeJSON } from "./types";

export async function runTailorPipeline(inputBuffer: Buffer, fileName: string, jd: string) {
  const traceId = createTraceId();
  logDebug(traceId,"pipeline","info","start",{ fileName });

  const ext = (fileName.split(".").pop() || "").toLowerCase();
  let parsed: ResumeJSON;
  if (ext === "pdf") {
    parsed = await parsePdf(inputBuffer);
  } else if (ext === "docx") {
    parsed = await parseDocx(inputBuffer);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
  parsed = normalize(parsed);
  logDebug(traceId,"pipeline","info","parsed",{ sections: parsed.sections.length });

  const tailored = await tailor(parsed, jd, traceId);
  logDebug(traceId,"pipeline","info","tailored_ok",{});

  const outDir = path.join(process.cwd(), "apps", "web", "public", "downloads", traceId);
  fs.mkdirSync(outDir, { recursive: true });

  const resumeHTML = resumeHtml(tailored.resume);
  const coverHTML = coverLetterHtml(tailored.coverLetter, tailored.resume.style);

  const resumePdf = path.join(outDir, "resume.pdf");
  const coverPdf = path.join(outDir, "cover-letter.pdf");
  await htmlToPdf(resumeHTML, resumePdf);
  await htmlToPdf(coverHTML, coverPdf);

  const resumeDocx = path.join(outDir, "resume.docx");
  const coverDocx = path.join(outDir, "cover-letter.docx");
  await resumeToDocx(tailored.resume, resumeDocx);
  await coverToDocx(tailored.coverLetter, coverDocx);

  const publicBase = `/downloads/${traceId}`;
  return {
    traceId,
    downloads: {
      resumePdf: `${publicBase}/resume.pdf`,
      resumeDocx: `${publicBase}/resume.docx`,
      coverPdf: `${publicBase}/cover-letter.pdf`,
      coverDocx: `${publicBase}/cover-letter.docx`,
    }
  };
}
