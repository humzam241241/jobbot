import { NextRequest, NextResponse } from 'next/server';
import { createTraceDir, getDownloadUrl } from '@/lib/server/paths';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resumeFile = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as string;
    
    if (!resumeFile) {
      return NextResponse.json({ ok: false, error: 'No resume file provided' }, { status: 400 });
    }

    // Generate a trace ID for this request
    const traceId = uuidv4().slice(0, 8);
    const traceDir = createTraceDir(traceId);

    // Save the uploaded file
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const inputPath = path.join(traceDir, 'input.pdf');
    fs.writeFileSync(inputPath, buffer);

    // TODO: Process the resume (this is where your AI processing would go)
    // For now, we'll just copy the input file as our "processed" files
    const resumePdfPath = path.join(traceDir, 'resume.pdf');
    const resumeDocxPath = path.join(traceDir, 'resume.docx');
    const coverPdfPath = path.join(traceDir, 'cover-letter.pdf');
    const coverDocxPath = path.join(traceDir, 'cover-letter.docx');
    const atsReportPath = path.join(traceDir, 'ats-report.pdf');

    // Copy input file to simulate processing
    fs.copyFileSync(inputPath, resumePdfPath);
    fs.copyFileSync(inputPath, coverPdfPath);
    fs.writeFileSync(resumeDocxPath, 'Placeholder DOCX');
    fs.writeFileSync(coverDocxPath, 'Placeholder DOCX');
    fs.writeFileSync(atsReportPath, 'Placeholder ATS Report');

    // Return download URLs
    return NextResponse.json({
      ok: true,
      traceId,
      files: {
        resumePdf: {
          publicUrl: getDownloadUrl(traceId, 'resume.pdf'),
          apiUrl: `/api/download/${traceId}/resume.pdf`,
          fileName: 'resume.pdf'
        },
        resumeDocx: {
          publicUrl: getDownloadUrl(traceId, 'resume.docx'),
          apiUrl: `/api/download/${traceId}/resume.docx`,
          fileName: 'resume.docx'
        },
        coverPdf: {
          publicUrl: getDownloadUrl(traceId, 'cover-letter.pdf'),
          apiUrl: `/api/download/${traceId}/cover-letter.pdf`,
          fileName: 'cover-letter.pdf'
        },
        coverDocx: {
          publicUrl: getDownloadUrl(traceId, 'cover-letter.docx'),
          apiUrl: `/api/download/${traceId}/cover-letter.docx`,
          fileName: 'cover-letter.docx'
        },
        atsReport: {
          publicUrl: getDownloadUrl(traceId, 'ats-report.pdf'),
          apiUrl: `/api/download/${traceId}/ats-report.pdf`,
          fileName: 'ats-report.pdf'
        }
      }
    });

  } catch (error: any) {
    console.error('Error processing resume:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Failed to process resume' 
    }, { status: 500 });
  }
}