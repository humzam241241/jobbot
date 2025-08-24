import { TailoredResume } from './schema';
import { ResumeFacts } from '../extract/to-facts';
import { validateTailoredContent } from './guardrails';
import { createLogger } from '@/lib/logger';

const logger = createLogger('llm-tailor');

/**
 * Tailors a resume to a job description using LLM
 */
export async function tailorResume(
  resumeFacts: ResumeFacts,
  jobDescription: string,
  options?: {
    provider?: string;
    model?: string;
  }
): Promise<TailoredResume> {
  logger.info('Tailoring resume', { 
    provider: options?.provider || 'default',
    model: options?.model || 'default'
  });
  
  try {
    // Import the LLM module
    const { llm } = await import('@/lib/providers/llm');
    
    // Create the system prompt
    const systemPrompt = `
    You are an expert resume tailoring assistant. Your task is to tailor the provided resume facts to match the job description.
    
    IMPORTANT RULES:
    1. You MUST return a valid JSON object matching the schema provided below.
    2. Only use facts from the original resume. DO NOT invent new experiences, employers, or dates.
    3. If the job description requires skills or experiences not in the resume, list them in the "gaps" array.
    4. Tailor the content to highlight relevant skills and experiences for the job.
    5. Quantify achievements where possible using numbers from the original resume.
    6. Keep bullet points concise (under 20 words each).
    7. Maintain the original chronology and structure.
    
    JSON SCHEMA:
    {
      "contact": {
        "name": string (optional),
        "email": string (optional),
        "phone": string (optional),
        "location": string (optional),
        "links": string[] (optional)
      },
      "summary": string,
      "skills": string[],
      "experience": [
        {
          "title": string,
          "company": string (optional),
          "location": string (optional),
          "startDate": string (optional),
          "endDate": string (optional),
          "bullets": string[]
        }
      ],
      "education": [
        {
          "degree": string (optional),
          "school": string,
          "location": string (optional),
          "startDate": string (optional),
          "endDate": string (optional),
          "gpa": string (optional),
          "details": string[] (optional)
        }
      ],
      "gaps": string[] (optional)
    }
    
    RETURN ONLY VALID JSON. NO PROSE.
    `;
    
    // Create the user prompt
    const userPrompt = `
    JOB DESCRIPTION:
    ${jobDescription}
    
    RESUME FACTS:
    ${JSON.stringify(resumeFacts, null, 2)}
    
    Please tailor this resume to match the job description. Return ONLY a valid JSON object according to the schema.
    `;
    
    // Call the LLM
    const response = await llm.complete({
      system: systemPrompt,
      user: userPrompt,
      model: options?.model || 'auto'
    });
    
    // Validate the response
    const validationResult = validateTailoredContent(response, resumeFacts);
    
    if (!validationResult.isValid || !validationResult.content) {
      logger.error('LLM response validation failed', { 
        errors: validationResult.errors
      });
      
      // Retry once with a more explicit prompt
      logger.info('Retrying with a more explicit prompt');
      
      const retryPrompt = `
      JOB DESCRIPTION:
      ${jobDescription}
      
      RESUME FACTS:
      ${JSON.stringify(resumeFacts, null, 2)}
      
      Your previous response had validation errors:
      ${validationResult.errors?.join('\n')}
      
      Please tailor this resume to match the job description. Return ONLY a valid JSON object according to the schema.
      Make sure to:
      1. Use proper JSON syntax with double quotes for keys and string values
      2. Only include information from the original resume
      3. Follow the exact schema structure
      `;
      
      const retryResponse = await llm.complete({
        system: systemPrompt,
        user: retryPrompt,
        model: options?.model || 'auto'
      });
      
      const retryValidation = validateTailoredContent(retryResponse, resumeFacts);
      
      if (!retryValidation.isValid || !retryValidation.content) {
        logger.error('Retry validation failed, falling back to default structure', {
          errors: retryValidation.errors
        });
        
        // Fall back to a default structure based on the original resume facts
        return createFallbackTailoredResume(resumeFacts, jobDescription);
      }
      
      return retryValidation.content;
    }
    
    logger.info('Resume tailoring successful');
    return validationResult.content;
  } catch (error) {
    logger.error('Error tailoring resume', { error });
    
    // Fall back to a default structure
    return createFallbackTailoredResume(resumeFacts, jobDescription);
  }
}

/**
 * Creates a fallback tailored resume when LLM fails
 */
function createFallbackTailoredResume(
  resumeFacts: ResumeFacts,
  jobDescription: string
): TailoredResume {
  logger.info('Creating fallback tailored resume');
  
  // Create a simple summary
  const summary = `Experienced professional with a background in ${
    resumeFacts.experience.length > 0 
      ? resumeFacts.experience[0].title || 'the industry'
      : 'the industry'
  }.`;
  
  // Extract skills
  const skills = resumeFacts.skills.length > 0 
    ? resumeFacts.skills 
    : ['Professional skills'];
  
  // Format experience
  const experience = resumeFacts.experience.map(exp => ({
    title: exp.title || 'Professional',
    company: exp.company,
    location: exp.location,
    startDate: exp.startDate,
    endDate: exp.endDate,
    bullets: exp.description || ['Contributed to company projects and initiatives.']
  }));
  
  // Format education
  const education = resumeFacts.education.map(edu => ({
    degree: edu.degree,
    school: edu.school || 'Educational Institution',
    location: edu.location,
    startDate: edu.startDate,
    endDate: edu.endDate,
    gpa: edu.gpa,
    details: edu.details
  }));
  
  return {
    contact: resumeFacts.contact,
    summary,
    skills,
    experience,
    education,
    gaps: ['Unable to fully tailor resume due to technical issues.']
  };
}
