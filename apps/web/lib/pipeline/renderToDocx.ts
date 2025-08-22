// apps/web/lib/pipeline/renderToDocx.ts
import "server-only";

import htmlToDocx from "html-to-docx";
import path from "path";
import fs from "fs/promises";
import { toHtmlString, HtmlLike } from "./html.server";
import { renderReactToHtml } from "./server-renderer";

type DocxOptions = {
  html: HtmlLike;
  fileName: string;        // e.g., "applicant_resume_123.docx"
  outDir?: string;         // default: "public/resumes"
};

export async function renderToDocx({ html, fileName, outDir = "public/resumes" }: DocxOptions) {
  const projectRoot = process.cwd();
  const absOutDir = path.join(projectRoot, outDir);
  await fs.mkdir(absOutDir, { recursive: true });

  // Convert input to HTML string
  let htmlString: string;
  
  // Handle React elements specially with the server renderer
  if (typeof html === 'object' && 
      html !== null && 
      (html as any).$$typeof) {
    // Use synchronous toHtmlString as a fallback in case renderReactToHtml fails
    try {
      htmlString = await Promise.resolve(renderReactToHtml(html));
    } catch (error) {
      console.error("Error rendering React to HTML:", error);
      htmlString = toHtmlString(html);
    }
  } else {
    htmlString = toHtmlString(html);
  }
                     
  const buffer = await htmlToDocx(htmlString, undefined, {
    table: { row: { cantSplit: true } },
    header: true,
    footer: true,
  });

  const absPath = path.join(absOutDir, fileName);
  await fs.writeFile(absPath, buffer);
  const urlPath = `/resumes/${fileName}`;
  return { absPath, urlPath };
}
