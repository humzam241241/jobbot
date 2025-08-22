// apps/web/lib/ai/json.ts
export function extractJsonBlocks(text: string): any | null {
  if (!text) return null;

  // Try raw JSON
  try { return JSON.parse(text); } catch {}

  // Try ```json ... ```
  const fence = /```json\s*([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }

  // Try first {...}
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i !== -1 && j !== -1 && j > i) {
    try { return JSON.parse(text.slice(i, j + 1)); } catch {}
  }
  return null;
}

/** Normalize various provider shapes into the canonical resume shape */
export function normalizeResumeJson(raw: any) {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw.tailoredResume ?? raw.resume ?? raw;

  const normalized = {
    name: src.name ?? src.fullName ?? '',
    contact: src.contact ?? {},
    summary: src.summary ?? '',
    skills: Array.isArray(src.skills) ? src.skills : [],
    experience: Array.isArray(src.experience) ? src.experience : [],
    projects: Array.isArray(src.projects) ? src.projects : [],
    education: Array.isArray(src.education) ? src.education : [],
    coverLetter: src.coverLetter ?? raw.coverLetter ?? '',
  };
  return normalized;
}
