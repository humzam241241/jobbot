export interface AtsScore {
  matchPercent: number;
  missingKeywords: string[];
  weakKeywords: string[];
  sectionBreakdown: {
    skills: number;
    experience: number;
    education: number;
    overall: number;
  };
  suggestions: string[];
}

export function computeAtsScore(resumeText: string, jdText: string): AtsScore {
  // Tokenize and normalize text
  const resumeTokens = tokenizeAndNormalize(resumeText);
  const jdTokens = tokenizeAndNormalize(jdText);
  
  // Extract key terms with weights
  const coreSkills = extractCoreSkills(jdText);
  const tools = extractTools(jdText);
  const softSkills = extractSoftSkills(jdText);
  
  // Calculate matches with weights
  const coreMatches = coreSkills.filter(skill => resumeTokens.includes(skill.toLowerCase()));
  const toolMatches = tools.filter(tool => resumeTokens.includes(tool.toLowerCase()));
  const softMatches = softSkills.filter(skill => resumeTokens.includes(skill.toLowerCase()));
  
  // Weighted scoring: core skills x3, tools x2, soft skills x1
  const totalWeight = (coreSkills.length * 3) + (tools.length * 2) + (softSkills.length * 1);
  const matchedWeight = (coreMatches.length * 3) + (toolMatches.length * 2) + (softMatches.length * 1);
  
  const matchPercent = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;
  
  // Find missing keywords
  const missingCore = coreSkills.filter(skill => !resumeTokens.includes(skill.toLowerCase()));
  const missingTools = tools.filter(tool => !resumeTokens.includes(tool.toLowerCase()));
  const missingKeywords = [...missingCore, ...missingTools].slice(0, 10);
  
  // Find weak keywords (mentioned only once)
  const weakKeywords = coreSkills.filter(skill => {
    const count = resumeText.toLowerCase().split(skill.toLowerCase()).length - 1;
    return count === 1;
  }).slice(0, 5);
  
  // Section breakdown
  const sectionBreakdown = {
    skills: calculateSectionScore(resumeText, 'skills', jdTokens),
    experience: calculateSectionScore(resumeText, 'experience', jdTokens),
    education: calculateSectionScore(resumeText, 'education', jdTokens),
    overall: matchPercent
  };
  
  // Generate suggestions
  const suggestions = generateSuggestions(matchPercent, missingKeywords, weakKeywords);
  
  return {
    matchPercent,
    missingKeywords,
    weakKeywords,
    sectionBreakdown,
    suggestions
  };
}

function tokenizeAndNormalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function extractCoreSkills(jdText: string): string[] {
  // Common technical skills patterns
  const skillPatterns = [
    /\b(javascript|typescript|python|java|react|angular|vue|node\.?js|express|mongodb|postgresql|mysql|aws|azure|gcp|docker|kubernetes|git)\b/gi,
    /\b(machine learning|artificial intelligence|data science|analytics|sql|nosql|api|rest|graphql|microservices)\b/gi,
    /\b(agile|scrum|devops|ci\/cd|testing|debugging|optimization|security|performance)\b/gi
  ];
  
  const skills = new Set<string>();
  skillPatterns.forEach(pattern => {
    const matches = jdText.match(pattern) || [];
    matches.forEach(match => skills.add(match.toLowerCase()));
  });
  
  return Array.from(skills);
}

function extractTools(jdText: string): string[] {
  const toolPatterns = [
    /\b(excel|word|powerpoint|tableau|power bi|figma|sketch|photoshop|illustrator|jira|confluence|slack|teams)\b/gi,
    /\b(salesforce|hubspot|google analytics|adobe|microsoft office|g suite|trello|asana|notion)\b/gi
  ];
  
  const tools = new Set<string>();
  toolPatterns.forEach(pattern => {
    const matches = jdText.match(pattern) || [];
    matches.forEach(match => tools.add(match.toLowerCase()));
  });
  
  return Array.from(tools);
}

function extractSoftSkills(jdText: string): string[] {
  const softSkillPatterns = [
    /\b(leadership|communication|collaboration|problem.solving|analytical|creative|strategic|detail.oriented)\b/gi,
    /\b(team.work|time.management|adaptability|innovation|critical.thinking|decision.making)\b/gi
  ];
  
  const skills = new Set<string>();
  softSkillPatterns.forEach(pattern => {
    const matches = jdText.match(pattern) || [];
    matches.forEach(match => skills.add(match.toLowerCase()));
  });
  
  return Array.from(skills);
}

function calculateSectionScore(resumeText: string, section: string, jdTokens: string[]): number {
  // Extract section content
  const sectionRegex = new RegExp(`${section}[\\s\\S]*?(?=\\n\\s*[A-Z][A-Z\\s]+:|$)`, 'i');
  const sectionMatch = resumeText.match(sectionRegex);
  if (!sectionMatch) return 0;
  
  const sectionText = sectionMatch[0];
  const sectionTokens = tokenizeAndNormalize(sectionText);
  
  // Count matches
  const matches = jdTokens.filter(token => sectionTokens.includes(token));
  return Math.round((matches.length / Math.max(jdTokens.length, 1)) * 100);
}

function generateSuggestions(matchPercent: number, missingKeywords: string[], weakKeywords: string[]): string[] {
  const suggestions: string[] = [];
  
  if (matchPercent < 60) {
    suggestions.push("Consider adding more relevant keywords from the job description to your experience bullets");
  }
  
  if (missingKeywords.length > 0) {
    suggestions.push(`Include these missing key skills if you have experience: ${missingKeywords.slice(0, 3).join(', ')}`);
  }
  
  if (weakKeywords.length > 0) {
    suggestions.push(`Strengthen mentions of: ${weakKeywords.slice(0, 2).join(', ')} by adding specific examples`);
  }
  
  suggestions.push("Use action verbs and quantify achievements where possible");
  suggestions.push("Ensure your most relevant experience appears in the top half of your resume");
  
  return suggestions.slice(0, 5);
}
