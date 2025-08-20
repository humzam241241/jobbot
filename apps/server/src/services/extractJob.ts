// packages/server/src/services/extractJob.ts
export class BlockedExtractionError extends Error {
  code = 'BLOCKED_EXTRACTION' as const;
  constructor(message = 'Blocked Extraction') {
    super(message);
    this.name = 'BlockedExtractionError';
  }
}

function isLinkedInUrl(url?: string) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'lnkd.in' || /(^|\.)linkedin\.com$/.test(h);
  } catch { return false; }
}

async function normalizeJD(raw: string) {
  return raw.replace(/\r/g, '').trim();
}

export async function extractJob(input: { url?: string; jdText?: string }) {
  // 1) If pasted JD provided, skip any scraping and use it.
  if (input.jdText && input.jdText.trim().length > 0) {
    return { description: await normalizeJD(input.jdText) };
  }
  // 2) Otherwise attempt scraping if URL provided.
  if (!input.url) throw new Error('Missing job source URL');

  try {
    const html = await scrapeHtml(input.url);                 // <-- wire to your existing scraper
    const extracted = await extractDescriptionFromHtml(html); // <-- your existing logic
    if (!extracted || extracted.trim().length < 30) {
      throw new BlockedExtractionError();
    }
    return { description: await normalizeJD(extracted) };
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const blocked =
      err?.code === 'BLOCKED_EXTRACTION' ||
      err?.name === 'BlockedExtractionError' ||
      isLinkedInUrl(input.url) ||
      /captcha|forbidden|not authorized|blocked/i.test(msg);
    if (blocked) throw new BlockedExtractionError();
    throw err;
  }
}

// --- Replace these stubs with your real implementations or adapters ---
async function scrapeHtml(url: string): Promise<string> { return ''; }
async function extractDescriptionFromHtml(html: string): Promise<string> { return ''; }
