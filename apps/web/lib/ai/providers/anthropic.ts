import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@/lib/logger';
import { AIProvider, AIGenerateOptions, AIGenerateResponse } from '../types';
import { retryWithBackoff } from '@/lib/utils/retry';

const logger = createLogger('anthropic-provider');

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;
  
  constructor(model: string = 'claude-3-5-sonnet') {
    // Validate and normalize model
    this.model = this.normalizeModel(model);
    
    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    
    logger.info('Anthropic provider initialized', { model: this.model });
  }
  
  /**
   * Generate optimized resume and cover letter
   */
  async generateResume(options: AIGenerateOptions): Promise<AIGenerateResponse> {
    const { resumeText, jobDescription, includeOriginalContent = false } = options;
    
    logger.info('Generating resume with Anthropic', { 
      model: this.model,
      resumeLength: resumeText.length,
      jobDescriptionLength: jobDescription.length
    });
    
    try {
      // Create system prompt
      const systemPrompt = this.createSystemPrompt(includeOriginalContent);
      
      // Create user prompt
      const userPrompt = this.createUserPrompt(resumeText, jobDescription);
      
      // Call Anthropic API with retry
      const completion = await retryWithBackoff(() => {
        return this.client.messages.create({
          model: this.model,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        });
      }, 3);
      
      // Parse response
      const content = completion.content[0]?.text || '{}';
      const response = JSON.parse(content);
      
      // Validate response
      if (!response.resumeContent || !response.coverLetterContent) {
        throw new Error('Invalid response from Anthropic');
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
      logger.error('Error generating resume with Anthropic', { error });
      throw new Error(`Anthropic generation failed: ${error.message}`);
    }
  }
  
  /**
   * Normalize model name
   */
  private normalizeModel(model: string): string {
    // Map of model aliases to actual model names
    const modelMap: Record<string, string> = {
      'claude': 'claude-3-5-sonnet',
      'claude-3': 'claude-3-5-sonnet',
      'claude-3-5': 'claude-3-5-sonnet',
      'claude-3-5-sonnet': 'claude-3-5-sonnet',
      'claude-3-opus': 'claude-3-opus',
      'claude-3-haiku': 'claude-3-haiku',
      'claude-3-sonnet': 'claude-3-sonnet',
      'default': 'claude-3-5-sonnet'
    };
    
    // Normalize model name
    const normalizedModel = model.toLowerCase().replace(/\s+/g, '-');
    
    // Return mapped model or original if not found
    return modelMap[normalizedModel] || normalizedModel;
  }
  
  /**
   * Create system prompt
   */
  private createSystemPrompt(includeOriginalContent: boolean): string {
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

Respond with a JSON object containing:
{
  "resumeContent": "The optimized resume content in markdown format",
  "coverLetterContent": "The cover letter content in markdown format"
}`;
  }
  
  /**
   * Create user prompt
   */
  private createUserPrompt(resumeText: string, jobDescription: string): string {
    return `# Original Resume
${resumeText}

# Job Description
${jobDescription}

Please optimize my resume for this job and create a matching cover letter.`;
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