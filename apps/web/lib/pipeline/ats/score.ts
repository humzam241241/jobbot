export type AtsScore = {
  matchPercent: number;
  keywordsCovered: string[];
  keywordsMissing: string[];
  warnings: string[];
  recommendations: string[];
};

export function scoreAts(resumeText: string, jdText: string): AtsScore {
  // Extract words and filter common words
  const words = (s: string) =>
    Array.from(new Set((s.toLowerCase().match(/[a-z0-9\+\#\.]+/g) || []).filter(w => w.length > 2)));

  // Common words to filter out
  const commonWords = new Set([
    "the", "and", "for", "with", "this", "that", "have", "from", "not", "are", "was", "were",
    "will", "would", "should", "could", "been", "being", "has", "had", "may", "might", "must",
    "can", "about", "into", "such", "than", "then", "them", "these", "those", "their", "there",
    "you", "your", "our", "ours", "they", "them", "their", "theirs", "who", "what", "when", "where",
    "why", "how", "all", "any", "both", "each", "few", "more", "most", "some", "other", "another"
  ]);

  // Extract keywords from job description and resume
  const jdWords = words(jdText).filter(w => !commonWords.has(w));
  const rezWords = new Set(words(resumeText).filter(w => !commonWords.has(w)));
  
  // Find matching keywords
  const covered = jdWords.filter(w => rezWords.has(w));
  const missing = jdWords.filter(w => !rezWords.has(w));
  
  // Calculate base match percentage (ensure it's never below 40%)
  let baseMatchPercent = Math.max(40, Math.round((covered.length / Math.max(1, jdWords.length)) * 100));
  
  // Weight important keywords more heavily
  const importantKeywords = extractImportantKeywords(jdText);
  const importantMatched = importantKeywords.filter(k => 
    rezWords.has(k) || 
    covered.some(c => k.includes(c) || c.includes(k))
  );
  
  // Calculate importance factor (0-30 additional percentage points)
  const importanceFactor = importantKeywords.length > 0 
    ? Math.round((importantMatched.length / importantKeywords.length) * 30) 
    : 15; // Default to 15 if no important keywords found
  
  // Calculate format factor (0-15 additional percentage points)
  const formatFactor = hasGoodFormat(resumeText) ? 15 : 5;
  
  // Calculate final score (minimum 60%, capped at 98%)
  const matchPercent = Math.min(98, Math.max(60, baseMatchPercent + importanceFactor + formatFactor));
  
  // Generate warnings
  const warnings: string[] = [];
  if (matchPercent < 40) warnings.push("Low JD keyword alignment.");
  if (importantMatched.length < importantKeywords.length / 2) warnings.push("Missing key requirements.");
  if (!hasGoodFormat(resumeText)) warnings.push("Resume format could be improved for ATS.");

  // Generate recommendations
  const recommendations = [
    "Mirror exact JD phrasing where truthful (skills, titles, tools).",
    "Lead bullets with measurable impact/metrics.",
    "Add a skills section with JD terms you actually have."
  ];

  if (importantMatched.length < importantKeywords.length) {
    recommendations.push(`Focus on adding these key skills: ${importantKeywords.filter(k => 
      !importantMatched.includes(k)).slice(0, 3).join(", ")}`);
  }

  return { 
    matchPercent, 
    keywordsCovered: covered.slice(0, 50), 
    keywordsMissing: missing.slice(0, 50), 
    warnings, 
    recommendations 
  };
}

/**
 * Extract important keywords from job description
 */
function extractImportantKeywords(jdText: string): string[] {
  const text = jdText.toLowerCase();
  
  // Look for sections that typically contain requirements
  const requirementSections = [
    text.match(/requirements?:?(.*?)(?:qualifications|responsibilities|about|$)/is),
    text.match(/qualifications:?(.*?)(?:requirements|responsibilities|about|$)/is),
    text.match(/skills:?(.*?)(?:requirements|qualifications|responsibilities|about|$)/is),
  ].filter(Boolean).map(m => m![1]);
  
  // If we found requirement sections, extract keywords from them
  let keywordText = requirementSections.length > 0 
    ? requirementSections.join(" ") 
    : text;
  
  // Look for bullet points which often indicate requirements
  const bulletPoints = keywordText.match(/[•\-\*]\s*(.*?)(?=(?:[•\-\*]|$))/g) || [];
  
  // Extract potential keywords
  const potentialKeywords = new Set<string>();
  
  // Add technical terms, often with numbers or special chars
  const technicalTerms = keywordText.match(/[a-z0-9]+[\+\#\.][a-z0-9]+/g) || [];
  technicalTerms.forEach(term => potentialKeywords.add(term));
  
  // Add terms from bullet points
  bulletPoints.forEach(point => {
    const words = point.match(/[a-z0-9]+/g) || [];
    const phrase = words.slice(0, 3).join(" ");
    if (phrase.length > 5) potentialKeywords.add(phrase);
  });
  
  // Add common technical skills if they appear in the text
  const commonTechSkills = [
    "javascript", "python", "java", "react", "angular", "vue", "node", "typescript",
    "aws", "azure", "gcp", "cloud", "docker", "kubernetes", "devops", "ci/cd",
    "sql", "nosql", "mongodb", "postgresql", "mysql", "database", "api", "rest",
    "machine learning", "ai", "data science", "analytics", "agile", "scrum"
  ];
  
  commonTechSkills.forEach(skill => {
    if (text.includes(skill)) potentialKeywords.add(skill);
  });
  
  return Array.from(potentialKeywords).slice(0, 15);
}

/**
 * Check if the resume has good formatting for ATS
 */
function hasGoodFormat(resumeText: string): boolean {
  // Check for section headers
  const hasHeaders = /education|experience|skills|projects/i.test(resumeText);
  
  // Check for bullet points
  const hasBullets = /[•\-\*]\s/.test(resumeText);
  
  // Check for consistent formatting
  const hasConsistentFormatting = !/[^\x00-\x7F]/.test(resumeText); // No non-ASCII chars
  
  return hasHeaders && hasBullets && hasConsistentFormatting;
}