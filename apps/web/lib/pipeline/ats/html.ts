import { AtsScore } from "./score";

export function atsHtml(score: AtsScore, candidate?: { name?: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>ATS Report</title>
<style>
  body { font-family: Inter, Arial, sans-serif; margin: 0.75in; color:#111 }
  h1,h2 { margin: 0 0 8px; }
  .badge { display:inline-block; padding:4px 8px; border-radius:6px; background:#eef; }
  ul { margin:6px 0 10px 18px; }
  p { margin:8px 0; }
</style>
</head>
<body>
  <h1>ATS Compatibility Report ${candidate?.name ? "— " + candidate.name : ""}</h1>
  <p class="badge">Match: <strong>${score.matchPercent}%</strong></p>

  <h2>Keywords Covered</h2>
  <p>${score.keywordsCovered.slice(0,30).join(", ") || "—"}</p>

  <h2>Missing Keywords</h2>
  <p>${score.keywordsMissing.slice(0,30).join(", ") || "—"}</p>

  <h2>Warnings</h2>
  <ul>${score.warnings.map(w => `<li>${w}</li>`).join("") || "<li>None</li>"}</ul>

  <h2>Recommendations</h2>
  <ul>${score.recommendations.map(r => `<li>${r}</li>`).join("")}</ul>
</body></html>`;
