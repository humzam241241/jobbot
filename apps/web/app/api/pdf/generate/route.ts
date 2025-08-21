import { NextRequest, NextResponse } from "next/server";
import { renderToStaticMarkup } from 'react-dom/server';
import { generatePdfFromHtml } from "@/lib/pdf/serverRenderer";
import { createLogger } from "@/lib/logger";
import MasterResume from "@/components/resume/MasterResume";
import CoverLetter from "@/components/resume/CoverLetter";
import ATSReport from "@/components/resume/ATSReport";

const logger = createLogger('pdf-api');

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { component, props, options } = data;

    let html = '';
    
    // Render the appropriate component
    switch (component) {
      case 'resume':
        html = renderToStaticMarkup(<MasterResume {...props} />);
        break;
      case 'coverLetter':
        html = renderToStaticMarkup(<CoverLetter {...props} />);
        break;
      case 'atsReport':
        html = renderToStaticMarkup(<ATSReport {...props} />);
        break;
      default:
        return NextResponse.json({ error: 'Invalid component type' }, { status: 400 });
    }

    // Generate PDF
    const { buffer, filePath } = await generatePdfFromHtml(html, options);

    // If we have a file path, return the URL, otherwise return the buffer as base64
    const pdfUrl = filePath 
      ? `/resumes/${filePath.split('resumes/')[1]}`
      : `data:application/pdf;base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      ok: true,
      url: pdfUrl,
      fileName: options.fileName
    });

  } catch (error: any) {
    logger.error('PDF generation failed', { error });
    return NextResponse.json(
      { error: error.message || 'PDF generation failed' },
      { status: 500 }
    );
  }
}
