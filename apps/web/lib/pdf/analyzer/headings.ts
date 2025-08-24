import { TextItem, Block, ConfidenceLevel, SectionType } from './types';

// Heading synonym sets for different section types
const HEADING_SYNONYMS: Record<string, string[]> = {
  [SectionType.PROFILE]: [
    'profile', 'summary', 'objective', 'professional profile', 'about me', 
    'career objective', 'personal statement', 'career summary', 'professional summary'
  ],
  [SectionType.SKILLS]: [
    'skills', 'technical skills', 'competencies', 'tooling', 'expertise',
    'core competencies', 'qualifications', 'technical expertise', 'key skills',
    'professional skills', 'technologies', 'technical proficiencies'
  ],
  [SectionType.EXPERIENCE]: [
    'experience', 'employment', 'professional experience', 'work history',
    'work experience', 'career history', 'employment history', 'relevant experience',
    'professional background', 'positions held'
  ],
  [SectionType.EDUCATION]: [
    'education', 'academics', 'academic background', 'educational background',
    'qualifications', 'academic qualifications', 'degrees', 'academic history',
    'educational history'
  ],
  [SectionType.OTHER]: [
    'certifications', 'awards', 'achievements', 'publications', 'projects',
    'volunteer work', 'activities', 'interests', 'languages', 'references',
    'professional affiliations', 'additional information'
  ]
};

/**
 * Detect headings in text items
 * @param blocks Array of blocks
 * @returns Array of blocks that are likely headings with their section type and confidence
 */
export function detectHeadings(blocks: Block[]): Array<Block & { sectionType: SectionType, confidence: number }> {
  const headings: Array<Block & { sectionType: SectionType, confidence: number }> = [];
  
  for (const block of blocks) {
    // Skip blocks with multiple lines - headings are usually single line
    if (block.lines.length > 3) continue;
    
    // Get the text from the block
    const text = block.lines.map(line => line.text).join(' ').trim().toLowerCase();
    
    // Skip if too long to be a heading
    if (text.length > 50) continue;
    
    // Calculate heading score based on various factors
    let headingScore = 0;
    
    // Check for font size difference compared to average
    const avgFontSize = calculateAverageFontSize(blocks);
    const blockFontSize = calculateAverageFontSize([block]);
    if (blockFontSize > avgFontSize * 1.2) headingScore += 0.3;
    
    // Check for bold text
    const hasBold = block.lines.some(line => line.boldGuess);
    if (hasBold) headingScore += 0.2;
    
    // Check for all caps
    const capsRatio = block.lines.reduce((sum, line) => sum + (line.capsRatio || 0), 0) / block.lines.length;
    if (capsRatio > 0.8) headingScore += 0.2;
    
    // Check for left alignment
    const isLeftAligned = block.rect.x < 100;
    if (isLeftAligned) headingScore += 0.1;
    
    // Check for whitespace around
    // (This would require more context about surrounding blocks)
    
    // Match against known section headings
    let bestSectionType = SectionType.UNKNOWN;
    let bestMatchScore = 0;
    
    for (const [sectionType, synonyms] of Object.entries(HEADING_SYNONYMS)) {
      for (const synonym of synonyms) {
        const matchScore = calculateFuzzyMatch(text, synonym);
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestSectionType = sectionType as SectionType;
        }
      }
    }
    
    // Boost score based on synonym match
    headingScore += bestMatchScore * 0.4;
    
    // Only consider as heading if score is high enough
    if (headingScore >= ConfidenceLevel.LOW) {
      headings.push({
        ...block,
        sectionType: bestSectionType,
        confidence: headingScore
      });
    }
  }
  
  return headings;
}

/**
 * Calculate the average font size across blocks
 * @param blocks Array of blocks
 * @returns Average font size
 */
function calculateAverageFontSize(blocks: Block[]): number {
  let totalSize = 0;
  let totalItems = 0;
  
  for (const block of blocks) {
    for (const line of block.lines) {
      totalSize += line.fontSize;
      totalItems++;
    }
  }
  
  return totalItems > 0 ? totalSize / totalItems : 0;
}

/**
 * Calculate a fuzzy match score between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Match score between 0 and 1
 */
function calculateFuzzyMatch(str1: string, str2: string): number {
  // Normalize strings
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
  
  // Exact match
  if (a === b) return 1;
  
  // Contains match
  if (a.includes(b) || b.includes(a)) {
    const longerLength = Math.max(a.length, b.length);
    const shorterLength = Math.min(a.length, b.length);
    return shorterLength / longerLength * 0.9; // 90% of perfect match
  }
  
  // Word match
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  
  let matchingWords = 0;
  for (const aWord of aWords) {
    if (bWords.some(bWord => bWord === aWord || bWord.includes(aWord) || aWord.includes(bWord))) {
      matchingWords++;
    }
  }
  
  const wordMatchRatio = matchingWords / Math.max(aWords.length, bWords.length);
  return wordMatchRatio * 0.8; // 80% of perfect match
}
