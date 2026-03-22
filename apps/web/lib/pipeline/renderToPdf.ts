// apps/web/lib/pipeline/renderToPdf.ts
import "server-only";

import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import path from "path";
import fs from "fs/promises";
import { toHtmlString, HtmlLike } from "./html.server";

type PdfOptions = {
  html: HtmlLike;
  title?: string;
  fileName: string;        // e.g., "applicant_resume_123.pdf"
  outDir?: string;         // default: "public/resumes"
};

export async function renderToPdf(opts: PdfOptions) {
  const { fileName, title, outDir = "public/resumes" } = opts;
  const projectRoot = process.cwd();            // running from apps/web
  const absOutDir = path.join(projectRoot, outDir);
  await fs.mkdir(absOutDir, { recursive: true });

  // Convert input to HTML string (callers must pre-render React elements before passing)
  const html = toHtmlString(opts.html);
  const pageHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title ?? ""}</title>
  <style>
    @page { margin: 20mm; }
    body { font-family: Inter, Arial, sans-serif; font-size: 11pt; line-height: 1.35; }
    h1,h2,h3 { margin: 0 0 6px; }
    ul { margin: 0 0 8px 20px; padding: 0; }
    li { margin: 2px 0; }
  </style>
</head>
<body>${html}</body>
</html>`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
    ),
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(pageHtml, { waitUntil: "networkidle0" });
    const absPath = path.join(absOutDir, fileName);
    await page.pdf({ path: absPath, format: "A4", printBackground: true });
    const urlPath = `/resumes/${fileName}`; // public URL
    return { absPath, urlPath };
  } finally {
    await browser.close();
  }
}