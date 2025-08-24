import { StyleManifest } from "../style/manifest";
import { resolveFamily } from "../style/font-map";

export function buildPrintCss(m: StyleManifest) {
  const families = [
    resolveFamily(m.fonts.primary.family),
    resolveFamily(m.fonts.heading.family)
  ];
  const unique = Array.from(new Map(families.map(f => [f.family, f])).values());

  const fontFaces = unique.map(u => u.faces.map(face => `
@font-face {
  font-family: '${u.family}';
  src: url('${face.file}') format('truetype');
  font-weight: ${face.weight};
  font-style: normal;
  font-display: swap;
}
  `).join("\n")).join("\n");

  return `
${fontFaces}
@page { size: ${m.page.size}; margin: ${m.page.margins.top}px ${m.page.margins.right}px ${m.page.margins.bottom}px ${m.page.margins.left}px; }
html, body { 
  font-family: '${resolveFamily(m.fonts.primary.family).family}', system-ui, sans-serif; 
  font-size: ${m.fonts.primary.size}pt; 
  line-height: ${m.fonts.primary.lineHeight}; 
  color: #000; 
  margin: 0;
  padding: 0;
}
h1, h2, h3 { 
  margin: 0 0 ${m.spacings.para}pt 0; 
  font-family: '${resolveFamily(m.fonts.heading.family).family}'; 
  font-weight: ${m.fonts.heading.weight}; 
  page-break-after: avoid;
}
h1 { 
  font-size: ${m.fonts.heading.h1}pt; 
  text-align: center;
}
h2 { 
  font-size: ${m.fonts.heading.h2}pt; 
  border-bottom: 1px solid #000;
  text-transform: uppercase;
}
h3 { 
  font-size: ${m.fonts.heading.h3}pt; 
}
.section { 
  margin-top: ${m.spacings.sectionTop}pt; 
  page-break-inside: avoid;
}
.header {
  text-align: center;
  margin-bottom: ${m.spacings.sectionTop}pt;
}
.contacts {
  margin-top: 5pt;
  text-align: center;
}
ul { 
  margin: 0; 
  padding-left: ${m.bullets.indentLeft}pt; 
  list-style-type: disc; 
}
li { 
  margin: 0 0 ${m.bullets.spacing}pt 0; 
  line-height: 1.4;
}
.exp, .proj {
  margin-bottom: 10pt;
}
.dates {
  font-style: italic;
  margin-bottom: 5pt;
}
.cover-letter-header {
  margin-top: 20pt;
  margin-bottom: 20pt;
  line-height: 1.5;
}
.date {
  margin-bottom: 5pt;
}
.position, .company, .location {
  margin-bottom: 2pt;
}
.greeting {
  margin-bottom: 15pt;
}
.cover-letter-body {
  margin-bottom: 20pt;
  text-align: justify;
  line-height: 1.5;
}
.cover-letter-body p {
  margin-bottom: 12pt;
  text-indent: 20pt;
}
.signature {
  margin-top: 20pt;
}
.signature div:first-child {
  margin-bottom: 15pt;
}

/* ATS Report Styles */
.ats-score-container {
  text-align: center;
  margin: 20pt 0;
}
.ats-score {
  font-size: 24pt;
  font-weight: bold;
}
.ats-score-label {
  font-style: italic;
  margin-top: 5pt;
}
.ats-meter {
  display: flex;
  align-items: center;
  margin: 10pt 0;
}
.ats-meter-label {
  width: 40pt;
  text-align: right;
  padding-right: 10pt;
  font-weight: bold;
}
.ats-meter-bar {
  flex-grow: 1;
  height: 15pt;
  background-color: #e5e7eb;
  border-radius: 8pt;
  overflow: hidden;
}
.ats-meter-fill {
  height: 100%;
}
.ats-description {
  font-style: italic;
  margin-top: 5pt;
  font-size: 9pt;
}
.ats-keywords {
  font-size: 9pt;
  line-height: 1.4;
}
li.warning {
  font-weight: bold;
}
`;
}
