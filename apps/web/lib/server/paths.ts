import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

export function getPublicDir() {
  // Works whether CWD is repo root or apps/web
  const here = path.dirname(fileURLToPath(import.meta.url));
  // apps/web/lib/server -> up to apps/web
  const appRoot = path.resolve(here, "../../..");
  const publicDir = path.join(appRoot, "public");
  return publicDir;
}

export function ensureDownloadsDir(traceId: string) {
  const publicDir = getPublicDir();
  const downloadsBase = path.join(publicDir, "downloads");
  const traceDir = path.join(downloadsBase, traceId);

  // Create directories if they don't exist
  [downloadsBase, traceDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  });

  return traceDir;
}

export function downloadsDir(traceId: string) {
  return ensureDownloadsDir(traceId);
}