// apps/web/lib/ai/compact.ts
export function compactText(text: string, max = 12000) {
  if (!text) return '';
  let s = text.replace(/\r/g, '').trim();
  if (s.length <= max) return s;

  const lines = s.split('\n');

  const head = lines.slice(0, 40); // keep header/contact/top
  const keepIf = (l: string) =>
    /^\s*[-*•]/.test(l) ||                  // bullets
    /experience|projects?|skills?|education|summary/i.test(l); // section cues

  const important = lines.filter(keepIf);
  const merged = [...head, '', ...important].join('\n');
  return merged.slice(0, max);
}
