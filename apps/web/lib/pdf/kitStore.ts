type KitPdfKind = "resume" | "cover" | "ats";
type KitPdfBundle = Partial<Record<KitPdfKind, Buffer>>;

// Use a global symbol to ensure the Map is a singleton across hot reloads.
const KITS_SYMBOL = Symbol.for("resume_bot.kit_store");

function getKitStore(): Map<string, KitPdfBundle> {
  if (!(global as any)[KITS_SYMBOL]) {
    (global as any)[KITS_SYMBOL] = new Map<string, KitPdfBundle>();
    console.log("Initialized new Kit Store singleton.");
  }
  return (global as any)[KITS_SYMBOL];
}

const KITS = getKitStore();

export function saveKitPdf(kitId: string, kind: KitPdfKind, buf: Buffer) {
  const prev = KITS.get(kitId) || {};
  prev[kind] = buf;
  KITS.set(kitId, prev);
  console.log(`Saved PDF for kitId=${kitId}, kind=${kind}, size=${buf.length}`);
}

export function getKitPdf(kitId: string, kind: KitPdfKind) {
  const data = KITS.get(kitId);
  const pdf = data?.[kind] || null;
  console.log(`Retrieved PDF for kitId=${kitId}, kind=${kind}, found=${!!pdf}`);
  return pdf;
}
