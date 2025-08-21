export type AtsScore = {
  matchPercent: number;                 // 0–100
  keywordsCovered: string[];            // from JD present in resume
  keywordsMissing: string[];            // from JD not present
  sectionCoverage: Record<string,number>; // per section % with JD terms
  warnings: string[];                   // formatting / red flags
  recommendations: string[];            // short, actionable
};

export function scoreAts(resumeText: string, jdText: string): AtsScore {
  const jdWords = Array.from(new Set(jdText.toLowerCase().match(/[a-z0-9\+\#\.]+/g) || [])).filter(w => w.length>2);
  const resWords = new Set((resumeText.toLowerCase().match(/[a-z0-9\+\#\.]+/g) || []).filter(w => w.length>2));
  const covered = jdWords.filter(w => resWords.has(w));
  const missing = jdWords.filter(w => !resWords.has(w));

  const matchPercent = Math.round((covered.length / Math.max(1, jdWords.length)) * 100);

  const warnings:string[] = [];
  if (matchPercent < 40) warnings.push("Low JD keyword alignment. Consider adding relevant terms truthfully.");
  // Add simple format checks:
  // (You can extend: bullet length, too many lines per bullet, empty sections, etc.)

  const recommendations = [
    "Mirror exact JD phrasing where truthful (skills, tools, job titles).",
    "Lead bullets with strong verbs + quantified outcomes.",
    "Group skills in a dedicated section using JD terms you actually have."
  ];

  return { matchPercent, keywordsCovered: covered.slice(0,100), keywordsMissing: missing.slice(0,100), sectionCoverage: {}, warnings, recommendations };
}
