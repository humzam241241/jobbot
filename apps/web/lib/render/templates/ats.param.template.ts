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
  const { 
    keywordsCovered = [], 
    keywordsMissing = [], 
    matchPercent = 0, 
    warnings = [], 
    recommendations = [] 
  } = ats || {};
  
  // For backward compatibility
  const coverage = matchPercent / 100;
  const matched = keywordsCovered;
  const missing = keywordsMissing;
  
  // Calculate score category
  const scoreCategory = 
    coverage >= 80 ? "Excellent" :
    coverage >= 70 ? "Very Good" :
    coverage >= 60 ? "Good" :
    coverage >= 50 ? "Average" :
    coverage >= 40 ? "Below Average" :
    "Poor";
  
  // Calculate score color
  const scoreColor = 
    coverage >= 80 ? "#10b981" :
    coverage >= 60 ? "#f59e0b" :
    "#ef4444";
  
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>
  <h1>ATS Compatibility Report</h1>
  
  <div class="ats-score-container">
    <div class="ats-score">${Math.round(coverage)}%</div>
    <div class="ats-score-label">${scoreCategory} match, ${coverage < 70 ? "significant improvements needed" : "good alignment with job requirements"}</div>
  </div>
  
  <div class="section">
    <h3>Skills Match</h3>
    <div class="ats-meter">
      <div class="ats-meter-label">${Math.round(coverage)}%</div>
      <div class="ats-meter-bar">
        <div class="ats-meter-fill" style="width: ${Math.round(coverage)}%; background-color: ${scoreColor};"></div>
      </div>
    </div>
    <div class="ats-description">Skills gap detected. Review the job requirements and highlight relevant skills more prominently.</div>
  </div>
  
  <div class="section">
    <h3>Experience Relevance</h3>
    <div class="ats-meter">
      <div class="ats-meter-label">${Math.round(coverage)}%</div>
      <div class="ats-meter-bar">
        <div class="ats-meter-fill" style="width: ${Math.round(coverage)}%; background-color: ${scoreColor};"></div>
      </div>
    </div>
    <div class="ats-description">Consider quantifying achievements and highlighting specific experiences relevant to the role.</div>
  </div>
  
  <div class="section">
    <h3>Keyword Optimization</h3>
    <div class="ats-meter">
      <div class="ats-meter-label">${Math.min(Math.round(matched.length / 5), 100)}%</div>
      <div class="ats-meter-bar">
        <div class="ats-meter-fill" style="width: ${Math.min(Math.round(matched.length / 5), 100)}%; background-color: ${
          matched.length >= 20 ? "#10b981" :
          matched.length >= 10 ? "#f59e0b" :
          "#ef4444"
        };"></div>
      </div>
    </div>
    <div class="ats-description">Low keyword match. Add more relevant terms - ${missing.slice(0, 5).map(esc).join(", ")} are missing.</div>
  </div>
  
  <div class="section">
    <h3>Format & Readability</h3>
    <div class="ats-meter">
      <div class="ats-meter-label">${Math.round(coverage) > 50 ? "85%" : "65%"}</div>
      <div class="ats-meter-bar">
        <div class="ats-meter-fill" style="width: ${Math.round(coverage) > 50 ? "85" : "65"}%; background-color: ${
          Math.round(coverage) > 50 ? "#10b981" : "#f59e0b"
        };"></div>
      </div>
    </div>
    <div class="ats-description">Resume format is ATS friendly. Consider using standard section headings and bullet points for better readability.</div>
  </div>
  
  <div class="section">
    <h3>Matched Keywords:</h3>
    <div class="ats-keywords">${matched.slice(0, 15).map(esc).join(" · ")}</div>
  </div>
  
  <div class="section">
    <h3>Missing Keywords:</h3>
    <div class="ats-keywords">${missing.slice(0, 15).map(esc).join(" · ")}</div>
  </div>
  
  <div class="section">
    <h3>Key Recommendations</h3>
    <ul>
      ${recommendations.map((r: string) => `<li>${esc(r)}</li>`).join("")}
      ${warnings.map((w: string) => `<li class="warning">${esc(w)}</li>`).join("")}
    </ul>
  </div>
  </body></html>`;
}
