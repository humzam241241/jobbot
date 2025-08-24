import type { AtsScore } from "./score";

export function atsHtml(score: AtsScore, candidateName?: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>ATS Report</title>
<style>
  body { font-family: Inter, Arial, sans-serif; margin: 0.75in; color:#111; line-height:1.45 }
  h1,h2 { margin: 0 0 8px; }
  .badge { display:inline-block; padding:6px 10px; border-radius:8px; background:#fff4cc; }
  ul { margin: 6px 0 10px 18px; }
  p { margin: 8px 0; }
</style>
</head>
<body>
  <h1>ATS Compatibility Report${candidateName ? " — " + candidateName : ""}</h1>
  <p class="badge"><strong>Match:</strong> ${score.matchPercent}%</p>

  <h2>Keywords Covered</h2>
  <p>${score.keywordsCovered.join(", ") || "—"}</p>

  <h2>Missing Keywords</h2>
  <p>${score.keywordsMissing.join(", ") || "—"}</p>

  <h2>Warnings</h2>
  <ul>${(score.warnings.length ? score.warnings : ["None"]).map(w => `<li>${w}</li>`).join("")}</ul>

  <h2>Recommendations</h2>
  <ul>${score.recommendations.map(r => `<li>${r}</li>`).join("")}</ul>
</body></html>`;
}