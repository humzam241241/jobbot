import { StyleManifest, defaultManifest } from "./manifest";
import { resolveFamily } from "./font-map";
import fs from "node:fs/promises";

export async function analyzePdfToManifest(filePath: string): Promise<StyleManifest> {
  try {
    // Lazy-load pdfjs to avoid build-time require errors
    let pdfjsLib: any;
    try {
      // Prefer modern import; if unavailable, fall back silently to defaults
      const mod: any = await import("pdfjs-dist");
      pdfjsLib = mod;
      if (typeof pdfjsLib?.GlobalWorkerOptions !== 'undefined' && pdfjsLib.version) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      }
    } catch (e) {
      // If pdfjs-dist is not available in this environment, return defaults
      return defaultManifest;
    }

    // Read file into Uint8Array
    const data = new Uint8Array(await fs.readFile(filePath));

    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const text = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Get page dimensions for margins
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;
    
    // Simple heuristics: most common font size => body; max size => heading
    const sizes: Record<number, number> = {};
    const fontFamilies: Record<string, number> = {};
    const lineHeights: number[] = [];
    const paragraphSpacings: number[] = [];
    let maxSize = 0, commonSize = 0, commonCount = 0;
    let lefts: number[] = [];
    let rights: number[] = [];
    let tops: number[] = [];
    let bulletGlyph = "•";
    let lastY = -1;
    let lastItem: any = null;

    // Sort items by y-position (top to bottom) to analyze line heights
    const sortedItems = [...text.items].sort((a: any, b: any) => {
      const aY = a.transform?.[5] || 0;
      const bY = b.transform?.[5] || 0;
      return bY - aY; // Descending order (top to bottom)
    });

    for (const item of sortedItems as any[]) {
      // Font size analysis
      const s = Math.round((item.transform?.[0] || item.height || 11) * 10) / 10;
      sizes[s] = (sizes[s] || 0) + 1;
      if (s > maxSize) maxSize = s;
      
      // Font family analysis
      const fontName = item.fontName || "";
      fontFamilies[fontName] = (fontFamilies[fontName] || 0) + 1;
      
      // Position analysis
      const x = Math.round(item.transform?.[4] || 0);
      const y = Math.round(item.transform?.[5] || 0);
      const width = Math.round(item.width || 0);
      
      lefts.push(x);
      rights.push(x + width);
      tops.push(y);
      
      // Line height analysis
      if (lastY !== -1 && Math.abs(y - lastY) > 1) {
        lineHeights.push(Math.abs(y - lastY));
      }
      
      // Paragraph spacing analysis
      if (lastItem && item.str.trim() && lastItem.str.trim() && 
          Math.abs(y - lastY) > 1.5 * commonSize) {
        paragraphSpacings.push(Math.abs(y - lastY));
      }
      
      // Bullet analysis
      const str = (item.str || "") as string;
      if (/[•–\-◦]/.test(str.trim().charAt(0))) bulletGlyph = str.trim().charAt(0);
      
      lastY = y;
      lastItem = item;
    }
    
    // Determine most common font size
    Object.entries(sizes).forEach(([k, v]) => {
      if (v > commonCount) {
        commonCount = v;
        commonSize = Number(k);
      }
    });
    
    // Determine most common font family
    let commonFamily = "Inter"; // Default
    let maxFamilyCount = 0;
    Object.entries(fontFamilies).forEach(([family, count]) => {
      if (count > maxFamilyCount) {
        maxFamilyCount = count;
        commonFamily = family;
      }
    });

    // Calculate average line height
    const avgLineHeight = lineHeights.length > 0 
      ? lineHeights.reduce((sum, height) => sum + height, 0) / lineHeights.length / commonSize
      : 1.15;
    
    // Calculate average paragraph spacing
    const avgParaSpacing = paragraphSpacings.length > 0
      ? paragraphSpacings.reduce((sum, spacing) => sum + spacing, 0) / paragraphSpacings.length / 2
      : 3;
    
    // Calculate margins
    lefts.sort((a, b) => a - b);
    rights.sort((a, b) => b - a); // Descending
    tops.sort((a, b) => a - b);
    
    // Estimate margins based on text positions
    const leftMargin = lefts.length > 0 ? Math.max(10, lefts[0]) : 36;
    const rightMargin = rights.length > 0 ? Math.max(10, pageWidth - rights[0]) : 36;
    const topMargin = tops.length > 0 ? Math.max(10, pageHeight - tops[0]) : 36;
    const bottomMargin = 36; // Hard to estimate, use default
    
    // Create manifest with enhanced properties
    const manifest: StyleManifest = JSON.parse(JSON.stringify(defaultManifest));
    
    // Apply font family
    const familyEntry = resolveFamily(commonFamily);
    manifest.fonts.primary.family = familyEntry.family;
    manifest.fonts.heading.family = familyEntry.family;
    
    // Apply font sizes
    if (commonSize) manifest.fonts.primary.size = commonSize;
    manifest.fonts.primary.lineHeight = Math.max(1.1, Math.min(1.5, avgLineHeight));
    
    // Apply heading sizes
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
    
    // Apply margins
    manifest.page.margins = {
      top: Math.round(topMargin),
      right: Math.round(rightMargin),
      bottom: Math.round(bottomMargin),
      left: Math.round(leftMargin)
    };
    
    // Apply spacings
    manifest.spacings.para = Math.max(2, Math.round(avgParaSpacing));
    manifest.spacings.sectionTop = Math.max(8, Math.round(avgParaSpacing * 2));
    
    // Apply bullet settings
    const indent = lefts.length ? Math.max(14, Math.min(28, Math.round((lefts[0] || 14) + 10))) : 18;
    manifest.bullets.glyph = bulletGlyph;
    manifest.bullets.indentLeft = indent;
    manifest.bullets.spacing = Math.max(2, Math.round(avgLineHeight));

    return manifest;
  } catch (e) {
    console.error("Error analyzing PDF:", e);
    return defaultManifest;
  }
}
