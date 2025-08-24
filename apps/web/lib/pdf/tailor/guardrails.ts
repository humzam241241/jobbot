import { TailoredResume, TailoredResumeSchema } from './schema';
import { ResumeFacts } from '../extract/to-facts';
import { createLogger } from '@/lib/logger';
import JSON5 from 'json5';

const logger = createLogger('llm-guardrails');

/**
 * Validates that the tailored content is factually based on the original resume
 * and conforms to the expected schema
 */
export function validateTailoredContent(
  tailoredContent: string,
  originalFacts: ResumeFacts
): { isValid: boolean; content?: TailoredResume; errors?: string[] } {
  logger.info('Validating tailored content');
  
  try {
    // First, try to parse the content as JSON
    let parsedContent: any;
    
    try {
      // Try standard JSON.parse first
      parsedContent = JSON.parse(tailoredContent);
    } catch (jsonError) {
      logger.warn('Standard JSON parsing failed, trying JSON5', { error: jsonError });
      
      try {
        // Try JSON5 as a fallback (more lenient JSON parser)
        parsedContent = JSON5.parse(tailoredContent);
      } catch (json5Error) {
        logger.warn('JSON5 parsing failed, trying to extract JSON from text', { error: json5Error });
        
        // Try to extract JSON from the text (in case LLM wrapped it in markdown code blocks)
        const jsonMatch = tailoredContent.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            parsedContent = JSON5.parse(jsonMatch[1]);
          } catch (extractError) {
            logger.error('Failed to parse extracted JSON', { error: extractError });
            return { isValid: false, errors: ['Invalid JSON format'] };
          }
        } else {
          logger.error('No JSON found in the content');
          return { isValid: false, errors: ['No JSON found in the content'] };
        }
      }
    }
    
    // Validate against the schema
    const result = TailoredResumeSchema.safeParse(parsedContent);
    
    if (!result.success) {
      logger.error('Schema validation failed', { errors: result.error.errors });
      return { 
        isValid: false, 
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`) 
      };
    }
    
    const tailoredResume = result.data;
    
    // Validate factual accuracy
    const factualErrors = validateFactualAccuracy(tailoredResume, originalFacts);
    
    if (factualErrors.length > 0) {
      logger.error('Factual validation failed', { errors: factualErrors });
      return { isValid: false, errors: factualErrors };
    }
    
    logger.info('Tailored content validated successfully');
    return { isValid: true, content: tailoredResume };
  } catch (error) {
    logger.error('Error validating tailored content', { error });
    return { isValid: false, errors: ['Unexpected error during validation'] };
  }
}

/**
 * Validates that the tailored resume is factually based on the original resume
 */
function validateFactualAccuracy(
  tailoredResume: TailoredResume,
  originalFacts: ResumeFacts
): string[] {
  const errors: string[] = [];
  
  // Check contact information
  if (tailoredResume.contact.name && 
      originalFacts.contact.name && 
      tailoredResume.contact.name !== originalFacts.contact.name) {
    errors.push('Name does not match the original resume');
  }
  
  if (tailoredResume.contact.email && 
      originalFacts.contact.email && 
      tailoredResume.contact.email !== originalFacts.contact.email) {
    errors.push('Email does not match the original resume');
  }
  
  if (tailoredResume.contact.phone && 
      originalFacts.contact.phone && 
      tailoredResume.contact.phone !== originalFacts.contact.phone) {
    errors.push('Phone number does not match the original resume');
  }
  
  // Check experience
  const originalCompanies = new Set(
    originalFacts.experience
      .map(exp => exp.company)
      .filter(Boolean)
      .map(company => company!.toLowerCase())
  );
  
  for (const exp of tailoredResume.experience) {
    if (exp.company && !originalCompanies.has(exp.company.toLowerCase())) {
      // Check if it's a close match (to account for slight formatting differences)
      const closeMatch = Array.from(originalCompanies).some(
        company => levenshteinDistance(company, exp.company!.toLowerCase()) <= 3
      );
      
      if (!closeMatch) {
        errors.push(`Company "${exp.company}" not found in the original resume`);
      }
    }
  }
  
  // Check education
  const originalSchools = new Set(
    originalFacts.education
      .map(edu => edu.school)
      .filter(Boolean)
      .map(school => school!.toLowerCase())
  );
  
  for (const edu of tailoredResume.education) {
    if (!originalSchools.has(edu.school.toLowerCase())) {
      // Check if it's a close match
      const closeMatch = Array.from(originalSchools).some(
        school => levenshteinDistance(school, edu.school.toLowerCase()) <= 3
      );
      
      if (!closeMatch) {
        errors.push(`School "${edu.school}" not found in the original resume`);
      }
    }
  }
  
  return errors;
}

/**
 * Calculates the Levenshtein distance between two strings
 * Used to allow for slight differences in formatting
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize the matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[a.length][b.length];
}
