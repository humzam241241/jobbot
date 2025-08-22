export type AtsScore = {
  matchPercent: number;
  keywordsCovered: string[];
  keywordsMissing: string[];
  warnings: string[];
  recommendations: string[];
};

export function scoreAts(resumeText: string, jdText: string): AtsScore {
  const words = (s: string) =>
    Array.from(new Set((s.toLowerCase().match(/[a-z0-9\+\#\.]+/g) || []).filter(w => w.length > 2)));

  const jd = words(jdText);
  const rez = new Set(words(resumeText));
  const covered = jd.filter(w => rez.has(w));
  const missing = jd.filter(w => !rez.has(w));
  const matchPercent = Math.round((covered.length / Math.max(1, jd.length)) * 100);

  const warnings: string[] = [];
  if (matchPercent < 40) warnings.push("Low JD keyword alignment.");

  const recommendations = [
    "Mirror exact JD phrasing where truthful (skills, titles, tools).",
    "Lead bullets with measurable impact/metrics.",
    "Add a skills section with JD terms you actually have."
  ];

  return { matchPercent, keywordsCovered: covered.slice(0,50), keywordsMissing: missing.slice(0,50), warnings, recommendations };
}