import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { renderToPdf } from "@/lib/pipeline/renderToPdf";
import { createLogger } from "@/lib/logger";

const logger = createLogger('pdf-api');

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { component, props, options } = data;

    // Generate PDF directly from HTML
    const { html } = data;
    
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }
    
    // Generate PDF
    const result = await renderToPdf({
      html,
      title: options?.title || 'Document',
      fileName: options?.fileName || `document_${Date.now()}.pdf`
    });

    // Return the URL path
    return NextResponse.json({
      ok: true,
      url: result.urlPath,
      fileName: options?.fileName || `document_${Date.now()}.pdf`
    });

  } catch (error: any) {
    logger.error('PDF generation failed', { error });
    return NextResponse.json(
      { error: error.message || 'PDF generation failed' },
      { status: 500 }
    );
  }
}