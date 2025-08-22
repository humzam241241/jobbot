import { TailorResponseT } from "@/lib/schemas/resume";

export function computeATS(resume: TailorResponseT, jobDesc: string) {
  const jd = jobDesc.toLowerCase();
  const skillList = (resume.tailoredResume?.skills ?? []).map(s => s.toLowerCase());
  const expText = (resume.tailoredResume?.experience ?? [])
    .map(e => [e.company, e.role, ...(e.bullets ?? [])].join(" "))
    .join(" ")
    .toLowerCase();

  const uniqueSkills = new Set(skillList);
  let hit = 0; let total = 0;
  for (const s of uniqueSkills) { total += 1; if (jd.includes(s) || expText.includes(s)) hit += 1; }
  const coverage = total ? (hit / total) : 0;

  const lengthPenalty = Math.max(0, 1 - Math.abs((resume.tailoredResume?.bulletsCount ?? 20) - 20) / 20);
  const score = Math.round((coverage * 0.8 + lengthPenalty * 0.2) * 100);

  return { score, coverage: +(coverage*100).toFixed(1), totalSkills: total, matchedSkills: hit };
}