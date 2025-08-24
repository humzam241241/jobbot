import * as pdfjs from "pdfjs-dist";
import { StyleManifest, defaultManifest } from "./manifest";
import { resolveFamily } from "./font-map";
import fs from "node:fs/promises";

// Initialize PDF.js
const pdfjsLib = pdfjs as any;
if (typeof window === 'undefined') {
  // We're on the server, so we need to set up the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function analyzePdfToManifest(filePath: string): Promise<StyleManifest> {
  try {
    // pdfjs needs a Uint8Array
    const data = new Uint8Array(await fs.readFile(filePath));
    
    // Load the PDF document
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    
    // Simple heuristics: most common font size => body; max size => heading
    const sizes: Record<number, number> = {};
    let maxSize = 0, commonSize = 0, commonCount = 0;
    let lefts: number[] = [];
    let bulletGlyph = "•";

    for (const item of text.items as any[]) {
      const s = Math.round((item.transform?.[0] || item.height || 11) * 10) / 10;
      sizes[s] = (sizes[s] || 0) + 1;
      if (s > maxSize) maxSize = s;
      
      // approximate left indent
      const x = Math.round(item.transform?.[4] || 0);
      lefts.push(x);
      
      const str = (item.str || "") as string;
      if (/[•–\-◦]/.test(str.trim().charAt(0))) bulletGlyph = str.trim().charAt(0);
    }
    
    Object.entries(sizes).forEach(([k, v]) => {
      if (v > commonCount) {
        commonCount = v;
        commonSize = Number(k);
      }
    });

    // very naive margin guess; keep defaults but allow small tweak
    const manifest: StyleManifest = JSON.parse(JSON.stringify(defaultManifest));
    
    // map font family by simple guess: pdfs often say Helvetica-like; pick by dominance
    // Since pdfjs font names are indirect, we default; users get substitute mapping anyway.
    const familyEntry = resolveFamily(undefined);

    manifest.fonts.primary.family = familyEntry.family;
    manifest.fonts.heading.family = familyEntry.family;
    
    if (commonSize) manifest.fonts.primary.size = commonSize;
    
    if (maxSize) {
      manifest.fonts.heading.h1 = Math.max(maxSize, manifest.fonts.primary.size + 4);
      manifest.fonts.heading.h2 = Math.max(
        manifest.fonts.primary.size + 2, 
        Math.round((manifest.fonts.heading.h1 + manifest.fonts.primary.size) / 2)
      );
      manifest.fonts.heading.h3 = Math.max(
        manifest.fonts.primary.size + 1, 
        Math.round((manifest.fonts.heading.h2 + manifest.fonts.primary.size) / 2)
      );
    }
    
    // bullets / indent
    lefts.sort((a, b) => a - b);
    const indent = lefts.length ? Math.max(14, Math.min(28, Math.round((lefts[0] || 14)))) : 18;
    manifest.bullets.glyph = bulletGlyph;
    manifest.bullets.indentLeft = indent;

    return manifest;
  } catch (e) {
    console.error("Error analyzing PDF:", e);
    return defaultManifest;
  }
}
