/**
 * Compute an ATS compatibility score from plain text resume content and job description.
 * This is a string-based wrapper for use by the generator module.
 */
export function computeAtsScore(resumeText: string, jobDescription: string): {
  matchPercent: number;
  sectionBreakdown: { skills: number; experience: number; education: number };
  missingKeywords: string[];
  weakKeywords: string[];
  suggestions: string[];
} {
  const jd = jobDescription.toLowerCase();
  const resume = resumeText.toLowerCase();

  // Extract keywords from job description (words 4+ chars, deduplicated)
  const jdWords = [...new Set(
    jd.match(/\b[a-z][a-z\-\+#\.]{3,}\b/g) ?? []
  )];

  // Count matches
  const matched: string[] = [];
  const missing: string[] = [];
  const weak: string[] = [];

  for (const word of jdWords) {
    const count = (resume.match(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []).length;
    if (count === 0) {
      missing.push(word);
    } else if (count === 1) {
      weak.push(word);
      matched.push(word);
    } else {
      matched.push(word);
    }
  }

  const coverage = jdWords.length > 0 ? matched.length / jdWords.length : 0;
  const matchPercent = Math.round(coverage * 100);

  // Simple section heuristics
  const hasSkills = /skills|technologies|proficien/i.test(resumeText) ? 1 : 0.5;
  const hasExperience = /experience|work history|employment/i.test(resumeText) ? 1 : 0.5;
  const hasEducation = /education|degree|university|college/i.test(resumeText) ? 1 : 0.5;

  const suggestions: string[] = [];
  if (missing.length > 5) suggestions.push("Consider incorporating more keywords from the job description.");
  if (weak.length > 3) suggestions.push("Strengthen keyword usage by mentioning key terms multiple times in context.");
  if (!hasSkills) suggestions.push("Add a dedicated Skills section.");
  if (!hasExperience) suggestions.push("Ensure your Experience section is clearly labeled.");
  if (matchPercent < 50) suggestions.push("Your resume may need significant tailoring for this role.");
  if (suggestions.length === 0) suggestions.push("Resume appears well-tailored to this job description.");

  return {
    matchPercent,
    sectionBreakdown: {
      skills: Math.round(hasSkills * matchPercent),
      experience: Math.round(hasExperience * matchPercent),
      education: Math.round(hasEducation * matchPercent),
    },
    missingKeywords: missing.slice(0, 15),
    weakKeywords: weak.slice(0, 10),
    suggestions,
  };
}
