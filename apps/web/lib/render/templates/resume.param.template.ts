import { StyleManifest } from "../../style/manifest";
import { buildPrintCss } from "../print-css";

function esc(s: string) { 
  return (s || "").replace(/[&<>"]/g, m => ({ 
    "&": "&amp;", 
    "<": "&lt;", 
    ">": "&gt;", 
    "\"": "&quot;" 
  }[m] as string)); 
}

export function resumeTemplate(m: StyleManifest, data: any) {
  const { header, summary, skills, experience, projects, education } = data;
  const css = buildPrintCss(m);
  
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}</style></head><body>
  <div class="header">
    <h1 class="name">${esc(header?.fullName || "")}</h1>
    <div class="contacts">${(header?.contacts || []).map(esc).join(" · ")}</div>
  </div>
  ${summary ? `<div class="section"><h2>PROFESSIONAL SUMMARY</h2><div>${esc(summary)}</div></div>` : ``}
  ${skills?.length ? `<div class="section"><h2>SKILLS</h2><div>${skills.map(esc).join(" · ")}</div></div>` : ``}
  ${experience?.length ? `<div class="section"><h2>EXPERIENCE</h2>${
      experience.map((exp: any) => `
      <div class="exp">
        <h3>${esc(exp.role)}${exp.company ? ' — ' + esc(exp.company) : ''}</h3>
        <div class="dates">${esc(exp.start || "")}${exp.end ? ' – ' + esc(exp.end) : ''}</div>
        ${exp.bullets?.length ? `<ul>${exp.bullets.map((b: string) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")
    }</div>` : ``}
  ${projects?.length ? `<div class="section"><h2>PROJECTS</h2>${
      projects.map((p: any) => `
      <div class="proj">
        <h3>${esc(p.name)}</h3>
        ${p.bullets?.length ? `<ul>${p.bullets.map((b: string) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      </div>`).join("")
    }</div>` : ``}
  ${education?.length ? `<div class="section"><h2>EDUCATION</h2>${
      education.map((e: any) => `<div>${esc(e.degree || "")}${e.school ? ' — ' + esc(e.school) : ''}${e.grad ? ' · ' + esc(e.grad) : ''}</div>`).join("")
    }</div>` : ``}
  </body></html>`;
}
