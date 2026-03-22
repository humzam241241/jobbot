import "server-only";
import { ReactNode } from "react";
import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";

/**
 * Renders a React component to HTML string
 * @param element React element to render
 * @returns HTML string
 */
export async function renderReactToHtml(element: ReactNode): Promise<string> {
  try {
    const { renderToStaticMarkup } = await import("react-dom/server");
    return renderToStaticMarkup(element as any);
  } catch (error) {
    console.error("Failed to render React element to HTML:", error);
    throw new Error("Failed to render React element to HTML on server.");
  }
}

/**
 * Options for PDF generation
 */
interface PdfOptions {
  fileName?: string;
  title?: string;
  outDir?: string;
  format?: "A4" | "Letter";
  landscape?: boolean;
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Generates a PDF from HTML
 * @param html HTML content to convert to PDF
 * @param options PDF generation options
 * @returns Object with buffer and file path
 */
export async function generatePdfFromHtml(
  html: string,
  options: PdfOptions = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  const {
    fileName = `document_${Date.now()}.pdf`,
    title = "Document",
    outDir,
    format = "A4",
    landscape = false,
    margins = {
      top: "20mm",
      right: "20mm",
      bottom: "20mm",
      left: "20mm",
    },
  } = options;

  // Create full HTML document
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { 
      margin-top: ${margins.top || "20mm"}; 
      margin-right: ${margins.right || "20mm"}; 
      margin-bottom: ${margins.bottom || "20mm"}; 
      margin-left: ${margins.left || "20mm"};
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11pt; 
      line-height: 1.35;
    }
    h1, h2, h3 { margin: 0 0 6px; }
    ul { margin: 0 0 8px 20px; padding: 0; }
    li { margin: 2px 0; }
  </style>
</head>
<body>${html}</body>
</html>`;

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format,
      landscape,
      printBackground: true,
    });

    // Save to file if outDir is specified
    let filePath: string | undefined;
    if (outDir) {
      const projectRoot = process.cwd();
      const absOutDir = path.join(projectRoot, outDir);
      await fs.mkdir(absOutDir, { recursive: true });

      // Generate unique filename to avoid collisions
      const uniqueFileName = `${path.parse(fileName).name}_${uuidv4().substring(0, 8)}${path.parse(fileName).ext}`;
      filePath = path.join(outDir, uniqueFileName);
      const absPath = path.join(projectRoot, filePath);
      await fs.writeFile(absPath, pdfBuffer);
    }

    return { buffer: pdfBuffer, filePath };
  } finally {
    await browser.close();
  }
}
