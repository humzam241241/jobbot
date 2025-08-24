import { StyleManifest, defaultManifest } from "./manifest";

export async function analyzeDocxToManifest(_filePath: string): Promise<StyleManifest> {
  // TODO: integrate a DOCX parser later; for now return defaults
  return defaultManifest;
}
