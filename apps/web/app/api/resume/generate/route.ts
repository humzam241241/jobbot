import { NextRequest, NextResponse } from "next/server";
import { createTraceId } from "@/lib/pipeline/trace";
import { runTailorPipeline } from "@/lib/pipeline";
import { scoreAts } from "@/lib/pipeline/ats/score";
import { atsHtml } from "@/lib/pipeline/ats/html";
import { htmlToPdf } from "@/lib/pipeline/export/toPdf";
import { ensureDownloadsDir } from "@/lib/server/paths";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const traceId = createTraceId();
  const outDir = ensureDownloadsDir(traceId);
  
  try {
    const formData = await req.formData();
    const file = formData.get("resumeFile") as File | null;
    const masterResumeText = formData.get("masterResumeText") as string;
    const jobUrl = formData.get("jobUrl") as string;
    const jobDescriptionText = formData.get("jobDescriptionText") as string;
    const notes = formData.get("notes") as string;
    const provider = formData.get("provider") as string;
    const model = formData.get("model") as string;

    if (!file && !masterResumeText) {
      return NextResponse.json(
        { ok: false, error: "Please provide either a resume file or text" },
        { status: 400 }
      );
    }

    if (!jobUrl && !jobDescriptionText) {
      return NextResponse.json(
        { ok: false, error: "Please provide either a job URL or description" },
        { status: 400 }
      );
    }

    // Run the tailoring pipeline
    const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.from(masterResumeText);
    const fileName = file ? file.name : "resume.txt";
    const jdText = jobDescriptionText || ""; // TODO: Extract from URL if provided

    const result = await runTailorPipeline(buffer, fileName, jdText);

    // Generate ATS report
    const score = scoreAts(result.plainText, jdText);
    const atsHtmlContent = atsHtml(score, { name: result.meta?.name });
    const atsPath = path.join(outDir, "ats-report.pdf");
    await htmlToPdf(atsHtmlContent, atsPath);

    // Verify files exist
    const expectedFiles = [
      "resume.pdf",
      "resume.docx",
      "cover-letter.pdf",
      "cover-letter.docx",
      "ats-report.pdf"
    ];

    const missingFiles = expectedFiles.filter(file => 
      !fs.existsSync(path.join(outDir, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing generated files: ${missingFiles.join(", ")}`);
    }

    // Build URLs
    const base = `/downloads/${traceId}`;
    const api = `/api/download/${traceId}`;

    // Test file access
    expectedFiles.forEach(file => {
      const filePath = path.join(outDir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.size === 0) {
          throw new Error(`Empty file: ${file}`);
        }
      } catch (e) {
        throw new Error(`File access error for ${file}: ${e.message}`);
      }
    });

    return NextResponse.json({
      ok: true,
      traceId,
      files: {
        resumePdf: {
          publicUrl: `${base}/resume.pdf`,
          apiUrl: `${api}/resume.pdf`,
          fileName: "resume.pdf"
        },
        resumeDocx: {
          publicUrl: `${base}/resume.docx`,
          apiUrl: `${api}/resume.docx`,
          fileName: "resume.docx"
        },
        coverPdf: {
          publicUrl: `${base}/cover-letter.pdf`,
          apiUrl: `${api}/cover-letter.pdf`,
          fileName: "cover-letter.pdf"
        },
        coverDocx: {
          publicUrl: `${base}/cover-letter.docx`,
          apiUrl: `${api}/cover-letter.docx`,
          fileName: "cover-letter.docx"
        },
        atsPdf: {
          publicUrl: `${base}/ats-report.pdf`,
          apiUrl: `${api}/ats-report.pdf`,
          fileName: "ats-report.pdf"
        }
      }
    });
  } catch (error: any) {
    console.error("Resume generation error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Failed to generate resume",
        traceId
      },
      { status: 500 }
    );
  }
}