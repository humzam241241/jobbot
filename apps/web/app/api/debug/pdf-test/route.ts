import { NextRequest, NextResponse } from "next/server";
import { renderPdf } from "@/lib/pdf/renderPdf";
import { logger } from "@/lib/logger";
import fs from "node:fs";
import path from "node:path";

export async function GET(req: NextRequest) {
  const traceId = logger.info("PDF test route called");
  
  try {
    // Create a simple HTML document
    const html = `
      <html>
        <body>
          <h1>PDF Test</h1>
          <p>This is a test PDF generated at ${new Date().toISOString()}</p>
          <p>If you can see this, PDF generation is working correctly.</p>
        </body>
      </html>
    `;
    
    // Generate PDF
    logger.info("Generating test PDF");
    const pdfBuffer = await renderPdf(html, { 
      title: "Test PDF",
      engine: "puppeteer" // Explicitly use puppeteer for reliability
    });
    logger.info(`PDF buffer generated, size: ${pdfBuffer.length} bytes`);
    
    // Save to debug directory
    try {
      const debugDir = path.join(process.cwd(), '..', '..', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const pdfPath = path.join(debugDir, `test-pdf-${traceId}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
      logger.info(`Test PDF saved to ${pdfPath}`);
    } catch (err) {
      logger.warn("Failed to save test PDF to debug directory", { error: err });
    }
    
    // Return the PDF as a data URL
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    
    return NextResponse.json({
      ok: true,
      message: "PDF generated successfully",
      pdfSize: pdfBuffer.length,
      pdfUrl: dataUrl,
      traceId
    });
  } catch (error: any) {
    logger.error("PDF test failed", { error });
    
    return NextResponse.json({
      ok: false,
      error: {
        message: error.message,
        stack: error.stack
      },
      traceId
    }, { status: 500 });
  }
}
