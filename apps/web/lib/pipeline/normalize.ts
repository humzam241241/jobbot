import type { ResumeJSON } from "./types";

export function normalize(resume: ResumeJSON): ResumeJSON {
  const sections = resume.sections
    .map((s, idx) => ({
      ...s,
      id: s.id || `sec-${idx}`,
      order: typeof s.order === "number" ? s.order : idx,
      heading: s.heading.trim(),
      content: (s.content || []).filter(c => c.text && c.text.trim().length > 0)
    }))
    .filter(s => s.heading && s.content.length > 0);

  return {
    meta: resume.meta,
    style: resume.style,
    sections: sections.sort((a,b) => a.order - b.order)
  };
}
