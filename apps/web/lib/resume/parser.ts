// apps/web/lib/resume/parser.ts
import "server-only";
export function extractStructure(text: string) {
  const lines = (text || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const has = (w: RegExp) => lines.some(l => w.test(l.toLowerCase()));
  const sections = [
    has(/summary|profile/) && "Summary",
    has(/skills|technologies|stack/) && "Skills",
    has(/experience|employment|work history/) && "Experience",
    has(/projects/) && "Projects",
    has(/education/) && "Education",
    has(/certifications|awards/) && "Certifications/Awards",
  ].filter(Boolean);
  return { sections, lineCount: lines.length };
}
