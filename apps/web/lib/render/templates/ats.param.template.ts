import { StyleManifest } from "../../style/manifest";
import { buildPrintCss } from "../print-css";

const esc = (s: string) => (s || "").replace(/[&<>"]/g, m => ({ 
  "&": "&amp;", 
  "<": "&lt;", 
  ">": "&gt;", 
  "\"": "&quot;" 
}[m] as string));

export function atsTemplate(m: StyleManifest, ats: any) {
  const css = buildPrintCss(m);
  const { keywords = [], matched = [], coverage = 0 } = ats || {};
  
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>
  <h2>ATS Match Report</h2>
  <div class="section"><h3>Estimated Match</h3><div>${Math.round(coverage * 100)}%</div></div>
  <div class="section"><h3>Top Keywords</h3><div>${keywords.map(esc).join(" · ")}</div></div>
  <div class="section"><h3>Matched</h3>${matched.length ? `<ul>${matched.map((m: string) => `<li>${esc(m)}</li>`).join("")}</ul>` : "<div>None</div>"}</div>
  </body></html>`;
}
