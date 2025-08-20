import { NextRequest, NextResponse } from "next/server";
import { htmlToPdfBuffer } from "@/lib/pdf/renderPdf";
import { saveKitPdf } from "@/lib/pdf/kitStore";
import { env } from "@/lib/env";
import { generateKitMulti } from "@/lib/generator";
import { generateHtml, optimizeLayout } from "@/lib/format/pageLayout";
import type { NormalizedResume } from "@/lib/types/resume";

export const runtime = env.nodeRuntime;
export const dynamic = "force-dynamic";

const j = (data:any, status=200)=> NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });

import { hasAnyProvider } from "@/lib/providers";

export async function HEAD(req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    if (!hasAnyProvider()) {
      return j({ 
        code: "NO_MODEL_KEY", 
        message: "Missing model API key"
      }, 400);
    }

  const body = await req.json().catch(()=> ({}));
  const jobUrl = String(body?.jobUrl || "");
  const masterResume = String(body?.masterResume || "");
  const provider = String(body?.provider || "auto");
  const model = body?.model ? String(body.model) : undefined;

  if (!jobUrl && !masterResume) {
    return j({ ok:false, error:"Provide jobUrl or masterResume" }, 400);
  }

  // 1) Generate structured content (JSON for resume, HTML for others)
  const started = Date.now();
  const gen = await generateKitMulti({ jobUrl, masterResume, model, provider });

  // Handle case where AI fails to return valid JSON
  if (!gen.resumeJson) {
    return j({
      ok: false,
      code: "GENERATION_ERROR",
      message: "AI failed to generate structured resume data. The model may be experiencing issues.",
      details: { provider, model, error: gen.resumeHtml } // Return the raw HTML error from generator
    }, 400);
  }

  const resumeData = gen.resumeJson as NormalizedResume;

  // 2) Generate clean HTML from the structured JSON data
  // We can pass different layout configs here in the future
  const resumeHtml = generateHtml(resumeData, optimizeLayout(resumeData));
  const textCover  = gen.coverHtml || "";
  const textAts    = gen.atsReport || "";

  // 3) Render PDFs from the clean, deterministic HTML
  const [resumePdf, coverPdf, atsPdf] = await Promise.all([
    htmlToPdfBuffer(resumeHtml, { title: "Resume", size: "Letter" }),
    htmlToPdfBuffer(textCover, { title: "Cover Letter", size: "Letter" }),
    htmlToPdfBuffer(textAts, { title: "ATS Report", size: "Letter" }),
  ]);

  // 4) Save PDFs and return URLs
  const kitId = `kit_${Date.now()}`;
  saveKitPdf(kitId, "resume", resumePdf);
  saveKitPdf(kitId, "cover", coverPdf);
  saveKitPdf(kitId, "ats", atsPdf);

  // Extract ATS score from the generated report
  const scoreMatch = /Match Score:\s*(\d+)%/i.exec(textAts);
  const atsScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

  return j({
    ok: true,
    kitId,
    texts: { resumeHtml, coverHtml: textCover, jobSummary: gen.jobSummary },
    usage: gen.usage,
    files: {
      resumePdfUrl: `/api/kits/${kitId}/resume`,
      coverLetterPdfUrl: `/api/kits/${kitId}/cover`,
      atsPdfUrl: `/api/kits/${kitId}/ats`,
    },
    ats: {
      score: atsScore,
      notes: ["ATS report generated with recommendations"]
    },
    backend: "local",
    durationMs: Date.now() - started,
  });
  } catch (error: any) {
    console.error("Resume kit generation failed:", error);
    
    // Check for our new, specific quota errors
    if (typeof error.message === 'string' && error.message.toLowerCase().includes('quota')) {
      return j({
        ok: false,
        code: "INSUFFICIENT_QUOTA",
        message: error.message, // Pass the detailed error message to the client
      }, 429); // Use 429 status code for "Too Many Requests"
    }

    return j({
      ok: false,
      code: "GENERATION_ERROR",
      message: error?.message || "An unexpected error occurred during generation",
      timestamp: new Date().toISOString(),
      details: {
        stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      }
    }, 500);
  }
}
