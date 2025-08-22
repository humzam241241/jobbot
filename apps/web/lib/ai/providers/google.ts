import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/lib/logger';
import { AIProvider, AIGenerateOptions, AIGenerateResponse } from '../types';
import { retryWithBackoff } from '@/lib/utils/retry';

const logger = createLogger('google-provider');

export class GoogleProvider implements AIProvider {
  private model: GenerativeModel;
  private modelName: string;
  
  constructor(modelName: string = 'gemini-2.5-pro') {
    // Validate and normalize model
    this.modelName = this.normalizeModel(modelName);
    
    // Initialize Google Generative AI client
    const apiKey = process.env.GOOGLE_API_KEY || '';
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: this.modelName });
    
    logger.info('Google provider initialized', { model: this.modelName });
  }
  
  /**
   * Generate optimized resume and cover letter
   */
  async generateResume(options: AIGenerateOptions): Promise<AIGenerateResponse> {
    const { resumeText, jobDescription, includeOriginalContent = false } = options;
    
    logger.info('Generating resume with Google', { 
      model: this.modelName,
      resumeLength: resumeText.length,
      jobDescriptionLength: jobDescription.length
    });
    
    try {
      // Create prompt
      const prompt = this.createPrompt(resumeText, jobDescription, includeOriginalContent);
      
      // Call Google API with retry
      const result = await retryWithBackoff(async () => {
        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 40,
            responseSchema: {
              type: 'object',
              properties: {
                resumeContent: { type: 'string' },
                coverLetterContent: { type: 'string' }
              },
              required: ['resumeContent', 'coverLetterContent']
            }
          }
        });
        return result;
      }, 3);
      
      // Parse response
      const responseText = result.response.text();
      
      // Extract JSON from response (handle potential text wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Google');
      }
      
      const response = JSON.parse(jsonMatch[0]);
      
      // Validate response
      if (!response.resumeContent || !response.coverLetterContent) {
        throw new Error('Invalid response structure from Google');
      }
      
      // Extract name from resume
      const name = this.extractName(response.resumeContent);
      
      return {
        resumeContent: response.resumeContent,
        coverLetterContent: response.coverLetterContent,
        name,
        id: uuidv4()
      };
    } catch (error: any) {
      logger.error('Error generating resume with Google', { error });
      throw new Error(`Google generation failed: ${error.message}`);
    }
  }
  
  /**
   * Normalize model name
   */
  private normalizeModel(model: string): string {
    // Map of model aliases to actual model names
    const modelMap: Record<string, string> = {
      'gemini': 'gemini-2.5-pro',
      'gemini-pro': 'gemini-2.5-pro',
      'gemini-2.5': 'gemini-2.5-pro',
      'gemini-2.5-pro': 'gemini-2.5-pro',
      'gemini-2.5-flash': 'gemini-2.5-flash',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'default': 'gemini-2.5-pro'
    };
    
    // Normalize model name
    const normalizedModel = model.toLowerCase().replace(/\s+/g, '-');
    
    // Return mapped model or original if not found
    return modelMap[normalizedModel] || normalizedModel;
  }
  
  /**
   * Create prompt
   */
  private createPrompt(resumeText: string, jobDescription: string, includeOriginalContent: boolean): string {
    return `You are an expert resume writer and career coach. Your task is to optimize a resume for a specific job description.
    
Follow these guidelines:
1. Maintain the original structure and sections of the resume
2. Keep all original qualifications, experiences, and education
3. Tailor the content to highlight relevant skills and experiences for the job
4. Use industry-standard formatting and language
5. Be concise and professional
6. Use action verbs and quantify achievements where possible
${includeOriginalContent ? '7. Incorporate as much of the original content as possible while optimizing' : ''}

For the cover letter:
1. Create a professional, personalized cover letter
2. Reference specific qualifications from the resume that match the job
3. Express enthusiasm for the position and company
4. Keep it to one page (3-4 paragraphs)
5. Include a strong opening and closing

# Original Resume
${resumeText}

# Job Description
${jobDescription}

Please optimize my resume for this job and create a matching cover letter.
Respond with a JSON object containing:
{
  "resumeContent": "The optimized resume content in markdown format",
  "coverLetterContent": "The cover letter content in markdown format"
}`;
  }
  
  /**
   * Extract name from resume content
   */
  private extractName(resumeContent: string): string {
    // Try to extract name from the first line
    const lines = resumeContent.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      
      // If first line is a markdown header, remove the #
      if (firstLine.startsWith('#')) {
        return firstLine.replace(/^#+\s+/, '');
      }
      
      // Otherwise use the first line if it's short enough to be a name
      if (firstLine.length > 0 && firstLine.length < 50) {
        return firstLine;
      }
    }
    
    return 'Candidate';
  }
}