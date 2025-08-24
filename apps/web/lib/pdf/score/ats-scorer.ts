import { TailoredResume } from '../tailor/schema';
import { extractKeywords, expandWithSynonyms } from './keyword-extractor';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ats-scorer');

export interface ATSScore {
  overall: number;
  skillsScore: number;
  experienceScore: number;
  keywordScore: number;
  matched: string[];
  missing: string[];
  recommendations: string[];
}

/**
 * Scores a tailored resume against a job description
 */
export function scoreResume(
  tailoredResume: TailoredResume,
  jobDescription: string
): ATSScore {
  logger.info('Scoring resume against job description');
  
  try {
    // Extract keywords from job description
    const jdKeywords = extractKeywords(jobDescription);
    const expandedJdKeywords = expandWithSynonyms(jdKeywords);
    
    // Extract keywords from resume
    const resumeText = resumeToText(tailoredResume);
    const resumeKeywords = extractKeywords(resumeText);
    const expandedResumeKeywords = expandWithSynonyms(resumeKeywords);
    
    // Find matching keywords
    const matched = expandedJdKeywords.filter(keyword => 
      expandedResumeKeywords.includes(keyword)
    );
    
    // Find missing keywords
    const missing = expandedJdKeywords.filter(keyword => 
      !expandedResumeKeywords.includes(keyword)
    );
    
    // Calculate keyword match percentage
    const keywordScore = Math.round((matched.length / Math.max(1, expandedJdKeywords.length)) * 100);
    
    // Calculate skills score
    const skillsScore = calculateSkillsScore(tailoredResume.skills, expandedJdKeywords);
    
    // Calculate experience score
    const experienceScore = calculateExperienceScore(tailoredResume.experience, expandedJdKeywords);
    
    // Calculate overall score
    // Weight: keywords 40%, skills 30%, experience 30%
    const overall = Math.round(
      (keywordScore * 0.4) + 
      (skillsScore * 0.3) + 
      (experienceScore * 0.3)
    );
    
    // Generate recommendations
    const recommendations = generateRecommendations(tailoredResume, missing);
    
    logger.info('Resume scoring complete', { 
      overall,
      keywordScore,
      skillsScore,
      experienceScore,
      matchedCount: matched.length,
      missingCount: missing.length
    });
    
    return {
      overall,
      skillsScore,
      experienceScore,
      keywordScore,
      matched,
      missing,
      recommendations
    };
  } catch (error) {
    logger.error('Error scoring resume', { error });
    
    // Return a default score
    return {
      overall: 70,
      skillsScore: 70,
      experienceScore: 70,
      keywordScore: 70,
      matched: [],
      missing: [],
      recommendations: [
        'Error calculating detailed ATS score. Please review your resume manually.',
        'Ensure your resume includes keywords from the job description.',
        'Quantify your achievements with metrics where possible.'
      ]
    };
  }
}

/**
 * Converts a tailored resume to plain text
 */
function resumeToText(resume: TailoredResume): string {
  const parts: string[] = [];
  
  // Add summary
  if (resume.summary) {
    parts.push(resume.summary);
  }
  
  // Add skills
  if (resume.skills.length > 0) {
    parts.push('Skills: ' + resume.skills.join(', '));
  }
  
  // Add experience
  for (const exp of resume.experience) {
    parts.push(`${exp.title || ''} ${exp.company || ''} ${exp.location || ''}`);
    
    for (const bullet of exp.bullets) {
      parts.push(bullet);
    }
  }
  
  // Add education
  for (const edu of resume.education) {
    parts.push(`${edu.degree || ''} ${edu.school || ''} ${edu.location || ''}`);
    
    if (edu.details) {
      for (const detail of edu.details) {
        parts.push(detail);
      }
    }
  }
  
  return parts.join('\n');
}

/**
 * Calculates a score for the skills section
 */
function calculateSkillsScore(skills: string[], jdKeywords: string[]): number {
  if (skills.length === 0 || jdKeywords.length === 0) {
    return 70; // Default score
  }
  
  // Extract keywords from skills
  const skillsKeywords = extractKeywords(skills.join(' '));
  const expandedSkillsKeywords = expandWithSynonyms(skillsKeywords);
  
  // Count matches
  const matches = jdKeywords.filter(keyword => 
    expandedSkillsKeywords.includes(keyword)
  );
  
  // Calculate score (60-100 range)
  return Math.min(100, Math.max(60, Math.round((matches.length / Math.max(1, jdKeywords.length)) * 100)));
}

/**
 * Calculates a score for the experience section
 */
function calculateExperienceScore(
  experience: TailoredResume['experience'], 
  jdKeywords: string[]
): number {
  if (experience.length === 0 || jdKeywords.length === 0) {
    return 70; // Default score
  }
  
  // Extract text from experience
  const expText = experience.map(exp => 
    `${exp.title || ''} ${exp.company || ''} ${exp.bullets.join(' ')}`
  ).join(' ');
  
  // Extract keywords from experience
  const expKeywords = extractKeywords(expText);
  const expandedExpKeywords = expandWithSynonyms(expKeywords);
  
  // Count matches
  const matches = jdKeywords.filter(keyword => 
    expandedExpKeywords.includes(keyword)
  );
  
  // Check for quantified achievements
  const hasQuantifiedAchievements = experience.some(exp => 
    exp.bullets.some(bullet => 
      /\d+%|\d+x|\$\d+|\d+\s+million|\d+\s+thousand|\d+\s+billion/.test(bullet)
    )
  );
  
  // Base score from keyword matches
  let score = Math.round((matches.length / Math.max(1, jdKeywords.length)) * 100);
  
  // Bonus for quantified achievements
  if (hasQuantifiedAchievements) {
    score += 10;
  }
  
  // Ensure score is in range 60-100
  return Math.min(100, Math.max(60, score));
}

/**
 * Generates recommendations based on the resume and missing keywords
 */
function generateRecommendations(
  resume: TailoredResume,
  missingKeywords: string[]
): string[] {
  const recommendations: string[] = [];
  
  // Recommend adding missing keywords
  if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 5);
    recommendations.push(`Add these missing keywords: ${topMissing.join(', ')}`);
  }
  
  // Check for quantified achievements
  const hasQuantifiedAchievements = resume.experience.some(exp => 
    exp.bullets.some(bullet => 
      /\d+%|\d+x|\$\d+|\d+\s+million|\d+\s+thousand|\d+\s+billion/.test(bullet)
    )
  );
  
  if (!hasQuantifiedAchievements) {
    recommendations.push('Quantify your achievements with metrics (e.g., increased revenue by 20%, reduced costs by $50k)');
  }
  
  // Check bullet point length
  const longBullets = resume.experience.flatMap(exp => 
    exp.bullets.filter(bullet => bullet.split(' ').length > 20)
  );
  
  if (longBullets.length > 0) {
    recommendations.push('Keep bullet points concise (under 20 words each) for better readability');
  }
  
  // Check skills section
  if (resume.skills.length < 5) {
    recommendations.push('Expand your skills section to include more relevant technologies and competencies');
  }
  
  // Add general recommendations
  recommendations.push('Ensure your resume is ATS-friendly with standard section headings');
  recommendations.push('Tailor your summary to highlight your most relevant experience for this role');
  
  return recommendations;
}
