import { StyleManifest } from "../../style/manifest";
import { buildPrintCss } from "../print-css";

const esc = (s: string) => (s || "").replace(/[&<>"]/g, m => ({ 
  "&": "&amp;", 
  "<": "&lt;", 
  ">": "&gt;", 
  "\"": "&quot;" 
}[m] as string));

export function coverTemplate(m: StyleManifest, data: any, jobDescription: string) {
  const css = buildPrintCss(m);
  
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>
  <h2>Cover Letter</h2>
  <div>${esc(data.header?.fullName || "")}</div>
  <div class="section">${esc(data.summary || "I'm excited to apply for this role.")}</div>
  <div class="section"><h3>Target Role</h3><div>${esc(jobDescription?.slice(0, 400) || "")}</div></div>
  </body></html>`;
}
