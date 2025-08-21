import fs from "fs";
import path from "path";

export function createTraceId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ensureDebugDir() {
  const dir = path.join(process.cwd(), "debug");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function logDebug(traceId: string, component: string, level: "info"|"warn"|"error", message: string, data?: any) {
  try {
    const dir = ensureDebugDir();
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      traceId, component, level, message, data
    }) + "\n";
    fs.appendFileSync(path.join(dir, `${traceId}.log`), line);
    // also mirror last errors in memory (very small ring buffer)
    // (lightweight: rely on existing /api/debug/last-errors if present)
  } catch {}
}
