import pdfParse from "pdf-parse";
import type { ResumeJSON } from "./types";
import { makeId } from "./types";

const SECTION_HINTS = [
  "summary","professional summary","experience","work experience","employment",
  "projects","education","skills","certifications","awards","publications"
];

function isLikelyHeading(line: string) {
  const t = line.trim();
  if (!t) return false;
  const words = t.split(/\s+/);
  const manyCaps = (t === t.toUpperCase()) && words.length <= 6;
  const endsColon = t.endsWith(":") && words.length <= 8;
  const known = SECTION_HINTS.some(h => t.toLowerCase().includes(h));
  return manyCaps || endsColon || known;
}
function isBullet(line: string) {
  return /^\s*([•\-\u2013\u2014\*]|[0-9]+\.)\s+/.test(line);
}

export async function parsePdf(buffer: Buffer): Promise<ResumeJSON> {
  const res = await pdfParse(buffer);
  const lines = res.text.split(/\r?\n/).map(l => l.replace(/\s+$/,""));
  const sections: ResumeJSON["sections"] = [];
  let current: { heading: string, content: any[] } | null = null;
  let order = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (isLikelyHeading(line)) {
      if (current) sections.push({ id: makeId("sec"), heading: current.heading, order: order++, content: current.content });
      current = { heading: line.replace(/:$/,""), content: [] };
      continue;
    }

    if (!current) {
      current = { heading: "Summary", content: [] };
    }

    if (isBullet(line)) {
      current.content.push({ type: "bullet", text: line.replace(/^\s*([•\-\u2013\u2014\*]|[0-9]+\.)\s+/, "") });
    } else {
      current.content.push({ type: "paragraph", text: line });
    }
  }
  if (current) sections.push({ id: makeId("sec"), heading: current.heading, order: order++, content: current.content });

  return {
    style: { fontFamily: "Inter, Arial, sans-serif", baseFontSize: 11, headingScale: 1.25, bulletStyle: "dash" },
    sections
  };
}
