import { createLogger } from '@/lib/logger';

const logger = createLogger('ats-analyzer');

interface ATSReport {
  score: number;
  matches: number;
  total: number;
  keywords: string[];
  missingKeywords?: string[];
  suggestions?: string[];
}

interface ResumeContent {
  summary?: string;
  experience?: Array<{
    company?: string;
    role?: string;
    bullets?: string[];
  }>;
  projects?: Array<{
    name?: string;
    bullets?: string[];
  }>;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    year?: string;
  }>;
}

/**
 * Analyzes resume content against job description to generate an ATS compatibility report
 */
export async function generateAtsReport(resumeContent: string, jobDescription: string): Promise<ATSReport> {
  try {
    logger.info('Generating ATS report');
    
    // Parse resume content
    let parsedContent: ResumeContent;
    try {
      parsedContent = JSON.parse(resumeContent);
    } catch (e) {
      logger.warn('Failed to parse JSON, treating as plain text', { error: e });
      parsedContent = { summary: resumeContent };
    }

    // Extract text from resume content
    const resumeText = extractTextFromContent(parsedContent);
    
    // Extract keywords from job description
    const keywords = extractKeywords(jobDescription);
    
    if (keywords.length === 0) {
      logger.warn('No keywords extracted from job description');
      return {
        score: 100,
        matches: 0,
        total: 0,
        keywords: []
      };
    }
    
    // Check which keywords are present in the resume
    const matches = keywords.filter(keyword => 
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Calculate score
    const score = Math.round((matches.length / keywords.length) * 100);
    
    // Get missing keywords
    const missingKeywords = keywords.filter(keyword => 
      !resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Generate suggestions
    const suggestions = generateSuggestions(missingKeywords);
    
    logger.info('ATS report generated', { 
      score, 
      matches: matches.length, 
      total: keywords.length,
      textLength: resumeText.length
    });
    
    return {
      score,
      matches: matches.length,
      total: keywords.length,
      keywords: matches,
      missingKeywords,
      suggestions
    };
  } catch (error) {
    logger.error('Error generating ATS report', { error });
    
    // Return a default report on error
    return {
      score: 0,
      matches: 0,
      total: 0,
      keywords: []
    };
  }
}

/**
 * Extract text from resume content
 */
function extractTextFromContent(content: ResumeContent): string {
  const parts: string[] = [];

  // Add summary
  if (content.summary) {
    parts.push(content.summary);
  }

  // Add experience
  if (content.experience?.length) {
    content.experience.forEach(exp => {
      if (exp.company) parts.push(exp.company);
      if (exp.role) parts.push(exp.role);
      if (exp.bullets?.length) parts.push(...exp.bullets);
    });
  }

  // Add projects
  if (content.projects?.length) {
    content.projects.forEach(project => {
      if (project.name) parts.push(project.name);
      if (project.bullets?.length) parts.push(...project.bullets);
    });
  }

  // Add skills
  if (content.skills?.length) {
    parts.push(...content.skills);
  }

  // Add education
  if (content.education?.length) {
    content.education.forEach(edu => {
      if (edu.school) parts.push(edu.school);
      if (edu.degree) parts.push(edu.degree);
    });
  }

  return parts.join(' ');
}

/**
 * Extracts relevant keywords from job description
 */
function extractKeywords(jobDescription: string): string[] {
  // Convert to lowercase for processing
  const text = jobDescription.toLowerCase();
  
  // Remove common stop words and punctuation
  const cleanText = text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s{2,}/g, ' ');
    
  // Split into words
  const words = cleanText.split(' ');
  
  // Filter out common words and short words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
    'we', 'us', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
    'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is',
    'are', 'was', 'were', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'should',
    'could', 'ought', 'i', 'me', 'my', 'myself'
  ]);
  
  // Extract potential keywords (non-stop words)
  const potentialKeywords = words.filter(word => 
    word.length > 2 && !stopWords.has(word)
  );
  
  // Count word frequency
  const wordFrequency: Record<string, number> = {};
  potentialKeywords.forEach(word => {
    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });
  
  // Extract technical terms and skills (often contain special characters or are capitalized)
  const technicalTerms = new Set<string>();
  const regex = /[A-Z][a-z]+|[A-Z]+(?![a-z])|[a-z]+|\d+/g;
  let match;
  
  while ((match = regex.exec(jobDescription)) !== null) {
    const term = match[0];
    if (term.length > 2 && !stopWords.has(term.toLowerCase())) {
      technicalTerms.add(term);
    }
  }
  
  // Look for multi-word technical terms
  const multiWordTerms = findMultiWordTerms(jobDescription);
  
  // Combine frequent words and technical terms
  const frequentWords = Object.entries(wordFrequency)
    .filter(([_, count]) => count > 1)
    .map(([word]) => word);
  
  // Combine all keywords and remove duplicates
  const allKeywords = [
    ...frequentWords,
    ...Array.from(technicalTerms),
    ...multiWordTerms
  ];
  
  // Remove duplicates and limit to top 30 keywords
  return Array.from(new Set(allKeywords))
    .filter(keyword => keyword.length > 2)
    .slice(0, 30);
}

/**
 * Find multi-word technical terms in the job description
 */
function findMultiWordTerms(text: string): string[] {
  const commonTechTerms = [
    'machine learning', 'artificial intelligence', 'data science', 'deep learning',
    'natural language processing', 'computer vision', 'software development',
    'front end', 'back end', 'full stack', 'web development', 'mobile development',
    'cloud computing', 'devops', 'project management', 'agile methodology',
    'customer service', 'product management', 'user experience', 'user interface',
    'quality assurance', 'business intelligence', 'data analysis', 'data visualization',
    'database management', 'network security', 'information technology', 'technical support',
    'system administration', 'content management', 'digital marketing', 'search engine optimization',
    'social media marketing', 'email marketing', 'market research', 'financial analysis',
    'human resources', 'customer relationship management', 'supply chain management',
    'operations management', 'strategic planning', 'risk management', 'change management',
    'sales management', 'account management', 'business development', 'public relations',
    'corporate communications', 'legal compliance', 'regulatory compliance', 'quality control',
    'continuous improvement', 'process improvement', 'performance optimization'
  ];
  
  // Check which common tech terms appear in the text
  return commonTechTerms.filter(term => 
    text.toLowerCase().includes(term.toLowerCase())
  );
}

/**
 * Generate suggestions based on missing keywords
 */
function generateSuggestions(missingKeywords: string[]): string[] {
  if (missingKeywords.length === 0) {
    return ['Your resume appears to match the job description well!'];
  }
  
  const suggestions: string[] = [];
  
  if (missingKeywords.length > 0) {
    suggestions.push(`Consider adding these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  
  if (missingKeywords.length > 5) {
    suggestions.push('Your resume is missing several key terms from the job description.');
  }
  
  return suggestions;
}