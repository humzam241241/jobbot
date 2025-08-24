export type StyleManifest = {
  page: { size: "Letter" | "A4"; margins: { top: number; right: number; bottom: number; left: number } };
  fonts: {
    primary: { family: string; weight: number; size: number; lineHeight: number };
    heading: { family: string; weight: number; h1: number; h2: number; h3: number };
  };
  bullets: { glyph: string; indentLeft: number; spacing: number };
  spacings: { sectionTop: number; para: number };
};

export const defaultManifest: StyleManifest = {
  page: { size: "Letter", margins: { top: 36, right: 36, bottom: 36, left: 36 } },
  fonts: {
    primary: { family: "Inter", weight: 400, size: 10.5, lineHeight: 1.15 },
    heading: { family: "Inter", weight: 600, h1: 16, h2: 13, h3: 11.5 }
  },
  bullets: { glyph: "•", indentLeft: 18, spacing: 3 },
  spacings: { sectionTop: 10, para: 3 }
};
