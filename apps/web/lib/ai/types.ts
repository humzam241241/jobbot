/**
 * Interface for AI provider responses
 */
export interface AIGenerateResponse {
  resumeContent: string;
  coverLetterContent: string;
  name?: string;
  id: string;
}

/**
 * Interface for AI provider options
 */
export interface AIGenerateOptions {
  resumeText: string;
  jobDescription: string;
  includeOriginalContent?: boolean;
}

/**
 * Interface for AI providers
 */
export interface AIProvider {
  /**
   * Generate optimized resume and cover letter
   */
  generateResume(options: AIGenerateOptions): Promise<AIGenerateResponse>;
}