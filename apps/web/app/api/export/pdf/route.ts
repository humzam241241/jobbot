import { NextRequest, NextResponse } from "next/server";
import html_to_pdf from "html-pdf-node";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic styling for the PDF document
const getHtmlWithStyle = (html: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        @page {
          margin: 0.5in;
          size: A4;
        }
        
        /* Base styles */
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Format preservation styles */
        .preserve-format {
          /* Preserve original spacing */
          line-height: inherit;
          margin: inherit;
          padding: inherit;
        }

        .preserve-format h1,
        .preserve-format h2,
        .preserve-format h3 {
          /* Keep original heading styles */
          font-weight: inherit;
          margin: inherit;
          color: inherit;
          border: inherit;
        }

        .preserve-format ul,
        .preserve-format li {
          /* Maintain original list formatting */
          margin: inherit;
          padding: inherit;
          list-style-type: inherit;
        }

        /* Professional format styles */
        .professional-format {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.75in;
          line-height: 1.4;
        }

        .professional-format .resume-header {
          text-align: center;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #2c5282;
          padding-bottom: 1rem;
        }

        .professional-format h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #1a202c;
        }

        .professional-format h2 {
          font-size: 18px;
          font-weight: 600;
          color: #2c5282;
          margin: 1.5rem 0 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .professional-format .contact-info {
          font-size: 0.9rem;
          color: #4a5568;
          margin: 0.5rem 0;
        }

        .professional-format .resume-section {
          margin-bottom: 1.25rem;
          page-break-inside: avoid;
        }

        .professional-format ul {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
          list-style-type: disc;
        }

        .professional-format li {
          margin-bottom: 0.4rem;
          line-height: 1.4;
        }

        .professional-format .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.5rem;
          margin: 0.75rem 0;
        }

        .professional-format .experience-item {
          margin-bottom: 1rem;
        }

        .professional-format .job-title {
          font-weight: 600;
          color: #1a202c;
        }

        .professional-format .company-name {
          color: #4a5568;
        }

        .professional-format .date-range {
          color: #718096;
          font-size: 0.9rem;
        }

        /* Common styles */
        strong {
          font-weight: 600;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          a {
            text-decoration: none;
            color: inherit;
          }

          .page-break {
            page-break-before: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="content">
        ${html}
      </div>
    </body>
  </html>
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { htmlContent, fileName = "document.pdf" } = body;

    if (!htmlContent) {
      return new NextResponse(JSON.stringify({ ok: false, error: "htmlContent is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fileBuffer = await html_to_pdf.generatePdf(
      { content: getHtmlWithStyle(htmlContent) },
      { format: "A4" }
    );

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });

  } catch (err: any) {
    console.error("PDF Generation Error:", err);
    return new NextResponse(JSON.stringify({ ok: false, error: "Failed to generate PDF", details: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
