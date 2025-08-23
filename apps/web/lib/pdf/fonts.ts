import fs from 'fs';
import path from 'path';
import type PDFDocument from 'pdfkit';

const FONTS_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'fonts');

function existing(p: string) {
  try {
    return fs.existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

const FALLBACK_REG = existing(path.join(FONTS_DIR, 'NotoSans-Regular.ttf'));
const FALLBACK_BOLD = existing(path.join(FONTS_DIR, 'NotoSans-Bold.ttf'));

// Map user-friendly names to our local fallbacks (all go to Noto Sans for now)
export const FONT_MAP: Record<string, { regular?: string; bold?: string }> = {
  Arial: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  Helvetica: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  Calibri: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  'Times New Roman': { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  Georgia: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  Verdana: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  'Courier New': { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
  Default: { regular: FALLBACK_REG, bold: FALLBACK_BOLD },
};

type Weight = 'regular' | 'bold';

export function prepareFonts(doc: PDFDocument, preferredFamily?: string) {
  let regPath = FALLBACK_REG;
  let boldPath = FALLBACK_BOLD;

  if (preferredFamily && FONT_MAP[preferredFamily]) {
    regPath = FONT_MAP[preferredFamily].regular ?? regPath;
    boldPath = FONT_MAP[preferredFamily].bold ?? boldPath;
  }

  let hasRegistered = false;

  try {
    if (regPath) {
      doc.registerFont('__Body', regPath);
      hasRegistered = true;
    }
    if (boldPath) {
      doc.registerFont('__BodyBold', boldPath);
      hasRegistered = true;
    }
  } catch (e) {
    console.warn('[pdf] Failed to register TTF fonts, will use minimal fallback.', e);
  }

  if (!hasRegistered) {
    console.warn('[pdf] Missing fallback fonts in /public/fonts. Using minimal in-memory fallback.');
  }

  function useFont(weight: Weight = 'regular') {
    // Prefer registered TTFs
    if (weight === 'bold' && doc._font && (doc as any)._font?.name !== '__BodyBold') {
      try { doc.font('__BodyBold'); return; } catch {}
    }
    if (weight === 'regular' && doc._font && (doc as any)._font?.name !== '__Body') {
      try { doc.font('__Body'); return; } catch {}
    }

    // Absolute last resort: try a generic embedded subset using the same registered names (noop if not registered).
    // Do NOT call doc.font('Helvetica') / Times-Roman / Courier here.
    try {
      if (weight === 'bold') doc.font('__BodyBold'); else doc.font('__Body');
    } catch {
      // If even that fails, proceed without changing font to avoid crashing.
    }
  }

  return { useFont };
}
