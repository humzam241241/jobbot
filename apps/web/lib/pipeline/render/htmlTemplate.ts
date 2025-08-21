import type { ResumeJSON } from "../types";

function esc(s: string) {
  return s
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

export function resumeHtml(resume: ResumeJSON) {
  const style = resume.style || {};
  const font = style.fontFamily || "Inter, Arial, sans-serif";
  const base = style.baseFontSize || 11;
  const hScale = style.headingScale || 1.25;
  const bulletClass = style.bulletStyle ? `bullets-${style.bulletStyle}` : "bullets-dash";

  const sections = resume.sections.map(sec => {
    const items = sec.content.map(item => {
      if (item.type === "bullet") return `<li>${esc(item.text)}</li>`;
      if (item.type === "subheading") return `<h3 class="subheading">${esc(item.text)}</h3>`;
      return `<p>${esc(item.text)}</p>`;
    }).join("\n");

    // group bullets into <ul>
    const grouped = items
      .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, `<ul>$1</ul>`); // simple grouping fallback

    return `
      <section class="sec">
        <h2>${esc(sec.heading)}</h2>
        ${grouped}
      </section>
    `;
  }).join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resume</title>
  <link rel="stylesheet" href="/styles/resume.css">
  <style>
    body { font-family: ${font}; font-size: ${base}pt; }
    h2 { font-size: ${Math.round(base*hScale)}pt; margin: 0 0 6px; }
  </style>
</head>
<body class="${bulletClass}">
  ${sections}
</body>
</html>
  `;
}

export function coverLetterHtml(cl: { greeting: string; intro: string; body: string[]; closing: string; signature: string }, style?: ResumeJSON["style"]) {
  const font = style?.fontFamily || "Inter, Arial, sans-serif";
  const base = style?.baseFontSize || 11;
  const bodyHtml = cl.body.map(p => `<p>${esc(p)}</p>`).join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cover Letter</title>
  <link rel="stylesheet" href="/styles/cover.css">
  <style> body { font-family: ${font}; font-size: ${base}pt; } </style>
</head>
<body>
  <p>${esc(cl.greeting)}</p>
  <p>${esc(cl.intro)}</p>
  ${bodyHtml}
  <p>${esc(cl.closing)}</p>
  <p>${esc(cl.signature)}</p>
</body>
</html>
  `;
}
