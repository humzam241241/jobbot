import natural from 'natural';
import { NormalizedResume, AtsAnalysis } from '@/lib/types/resume';

const tokenizer = new natural.WordTokenizer();
const NGrams = natural.NGrams;

// Common mechanical engineering term variations
const TERM_VARIATIONS: Record<string, string[]> = {
  'fea': ['finite element analysis', 'finite element', 'fem'],
  'cfd': ['computational fluid dynamics', 'fluid dynamics'],
  'gd&t': ['geometric dimensioning', 'geometric tolerancing', 'geometric dimensioning and tolerancing'],
  'cad': ['computer aided design', 'computer-aided design'],
  'plm': ['product lifecycle management'],
  'dfm': ['design for manufacturing'],
  'dfa': ['design for assembly'],
  'dfmea': ['design failure mode and effects analysis'],
  'solidworks': ['solid works', 'solid-works'],
  'autocad': ['auto-cad', 'auto cad'],
};

interface WeightedKeyword {
  term: string;
  weight: number;
  category: 'core' | 'tools' | 'soft';
}

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeyPhrases(text: string): WeightedKeyword[] {
  const normalized = normalizeText(text);
  const keywords: WeightedKeyword[] = [];

  // Extract unigrams, bigrams, and trigrams
  const unigrams = tokenizer.tokenize(normalized) || [];
  const bigrams = NGrams.bigrams(normalized) || [];
  const trigrams = NGrams.trigrams(normalized) || [];

  // Categorize and weight terms
  const addTerm = (term: string) => {
    // Core skills (technical requirements)
    if (/\b(engineer|design|develop|analyze|test|implement)\w*\b/.test(term)) {
      keywords.push({ term, weight: 3, category: 'core' });
    }
    // Tools and technologies
    else if (/\b(solidworks|autocad|matlab|ansys|catia|nx|inventor)\b/.test(term)) {
      keywords.push({ term, weight: 2, category: 'tools' });
    }
    // Soft skills
    else if (/\b(team|communicate|manage|lead|collaborate|solve)\w*\b/.test(term)) {
      keywords.push({ term, weight: 1, category: 'soft' });
    }
  };

  // Process n-grams
  unigrams.forEach(term => addTerm(term));
  bigrams.forEach(terms => addTerm(terms.join(' ')));
  trigrams.forEach(terms => addTerm(terms.join(' ')));

  // Handle term variations
  Object.entries(TERM_VARIATIONS).forEach(([key, variations]) => {
    if (normalized.includes(key)) {
      variations.forEach(variant => {
        keywords.push({ term: variant, weight: 2, category: 'tools' });
      });
    }
  });

  return keywords;
}

function calculateSectionScore(section: string, keywords: WeightedKeyword[]): number {
  const normalized = normalizeText(section);
  let score = 0;
  let maxPossible = 0;

  keywords.forEach(({ term, weight }) => {
    maxPossible += weight;
    if (normalized.includes(term)) {
      score += weight;
    }
  });

  return maxPossible > 0 ? (score / maxPossible) * 100 : 0;
}

export function computeAtsScore(resume: NormalizedResume, jobDescription: string): AtsAnalysis {
  // Extract keywords from job description
  const jobKeywords = extractKeyPhrases(jobDescription);
  
  // Initialize tracking
  const foundKeywords = new Set<string>();
  const missingKeywords: string[] = [];
  const weakKeywords: string[] = [];

  // Analyze each section
  const sectionBreakdown = {
    summary: calculateSectionScore(resume.summary, jobKeywords),
    skills: calculateSectionScore(Object.values(resume.skills).flat().join(' '), jobKeywords),
    experience: calculateSectionScore(
      resume.experience.map(exp => `${exp.role} ${exp.bullets.join(' ')}`).join(' '),
      jobKeywords
    ),
    projects: calculateSectionScore(
      resume.projects.map(proj => `${proj.name} ${proj.bullets.join(' ')}`).join(' '),
      jobKeywords
    ),
    education: calculateSectionScore(
      resume.education.map(edu => `${edu.degree} ${edu.details.join(' ')}`).join(' '),
      jobKeywords
    )
  };

  // Calculate overall match percentage
  let totalWeight = 0;
  let matchedWeight = 0;

  jobKeywords.forEach(({ term, weight }) => {
    totalWeight += weight;
    const normalized = normalizeText(JSON.stringify(resume));
    
    if (normalized.includes(term)) {
      matchedWeight += weight;
      foundKeywords.add(term);
    } else {
      // Check if term appears but in a less impactful section
      const weakMatch = 
        resume.summary.toLowerCase().includes(term) ||
        Object.values(resume.skills).some(skills => skills.some(skill => skill.toLowerCase().includes(term)));
      
      if (weakMatch) {
        weakKeywords.push(term);
      } else {
        missingKeywords.push(term);
      }
    }
  });

  const matchPercent = Math.round((matchedWeight / totalWeight) * 100);

  // Generate suggestions
  const suggestions: string[] = [];

  if (missingKeywords.length > 0) {
    suggestions.push(`Consider adding these key terms: ${missingKeywords.slice(0, 3).join(', ')}`);
  }

  if (weakKeywords.length > 0) {
    suggestions.push(`Strengthen these terms by moving them to experience bullets: ${weakKeywords.slice(0, 3).join(', ')}`);
  }

  if (sectionBreakdown.summary < 50) {
    suggestions.push('Enhance your summary with more job-specific keywords');
  }

  if (sectionBreakdown.skills < 70) {
    suggestions.push('Add more technical skills that match the job requirements');
  }

  if (sectionBreakdown.experience < 60) {
    suggestions.push('Rewrite experience bullets to include more relevant technical terms');
  }

  return {
    matchPercent,
    missingKeywords: missingKeywords.slice(0, 10),
    weakKeywords: weakKeywords.slice(0, 8),
    sectionBreakdown,
    suggestions: suggestions.slice(0, 5)
  };
}
