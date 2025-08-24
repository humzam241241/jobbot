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
html, body { font-family: '${resolveFamily(m.fonts.primary.family).family}', system-ui, sans-serif; font-size: ${m.fonts.primary.size}pt; line-height: ${m.fonts.primary.lineHeight}; color: #000; }
h1, h2, h3 { margin: 0 0 ${m.spacings.para}pt 0; font-family: '${resolveFamily(m.fonts.heading.family).family}'; font-weight: ${m.fonts.heading.weight}; }
h1 { font-size: ${m.fonts.heading.h1}pt; }
h2 { font-size: ${m.fonts.heading.h2}pt; }
h3 { font-size: ${m.fonts.heading.h3}pt; }
.section { margin-top: ${m.spacings.sectionTop}pt; }
ul { margin: 0; padding-left: ${m.bullets.indentLeft}pt; list-style-type: disc; }
li { margin: 0 0 ${m.bullets.spacing}pt 0; }
`;
}
