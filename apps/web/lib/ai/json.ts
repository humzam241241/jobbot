// apps/web/lib/ai/json.ts

// Extract a JSON object from raw LLM text (raw, ```json fences, or first {...} blob)
export function extractJsonBlocks(text: string): any | null {
  if (!text) return null;

  // 1) raw JSON
  try { return JSON.parse(text); } catch {}

  // 2) ```json ... ```
  const fence = /```json\s*([\s\S]*?)```/i.exec(text);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1].trim()); } catch {}
  }

  // 3) first {...}
  const i = text.indexOf('{');
  const j = text.lastIndexOf('}');
  if (i !== -1 && j !== -1 && j > i) {
    const slice = text.slice(i, j + 1);
    try { return JSON.parse(slice); } catch {}
  }
  return null;
}

// Deeply convert null → undefined and clean arrays to strings-only
export function deepSanitize(value: any): any {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(v => deepSanitize(v))
      .filter(v => v !== undefined)                 // drop nulls
      .map(v => (typeof v === 'string' ? v : JSON.stringify(v))) // coerce non-strings in string arrays later
  }
  if (typeof value === 'object' && value) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const sanitized = deepSanitize(v);
      if (sanitized !== undefined) out[k] = sanitized;
    }
    return out;
  }
  return value;
}

/** Normalize various provider shapes into the canonical resume shape */
export function normalizeResumeJson(raw: any) {
  if (!raw || typeof raw !== 'object') return null;

  const src = (raw.tailoredResume ?? raw.resume ?? raw);
  const safe = deepSanitize(src);

  const normalized = {
    name: safe?.name ?? safe?.fullName ?? '',
    contact: safe?.contact ?? {},
    summary: safe?.summary ?? '',
    skills: Array.isArray(safe?.skills) ? safe.skills.map(String) : [],
    experience: Array.isArray(safe?.experience) ? safe.experience : [],
    projects: Array.isArray(safe?.projects) ? safe.projects : [],
    education: Array.isArray(safe?.education) ? safe.education : [],
    coverLetter: (raw.coverLetter ?? safe?.coverLetter ?? ''),
  };

  // Force bullets to strings
  const fixBullets = (arr: any[]) =>
    arr.map((it: any) => ({
      ...it,
      bullets: Array.isArray(it?.bullets) ? it.bullets.map(String).filter(Boolean) : [],
    }));

  normalized.experience = fixBullets(normalized.experience);
  normalized.projects = fixBullets(normalized.projects);

  return normalized;
}