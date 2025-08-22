import { trace } from '../pipeline/trace';
import { getAiProvider } from '../ai';

interface AtsScore {
  overall: number;
  skills: number;
  experience: number;
  education: number;
  keywords: number;
}

interface AtsAnalysis {
  score: AtsScore;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export async function analyzeResumeAts(
  resumeContent: string,
  jobDescription: string
): Promise<AtsAnalysis> {
  try {
    const provider = getAiProvider('auto');
    
    const prompt = `
      Analyze this resume against the job description for ATS compatibility.
      Provide a detailed analysis in the following JSON format:
      {
        "score": {
          "overall": number (0-100),
          "skills": number (0-100),
          "experience": number (0-100),
          "education": number (0-100),
          "keywords": number (0-100)
        },
        "matchedKeywords": string[],
        "missingKeywords": string[],
        "suggestions": string[]
      }

      Resume:
      ${resumeContent}

      Job Description:
      ${jobDescription}

      Provide specific, actionable suggestions for improving ATS compatibility.
      Focus on keyword matches, formatting, and content alignment.
      Identify both technical and soft skills mentioned in the job description.
    `;

    const response = await provider.generateText(prompt);
    
    try {
      const analysis = JSON.parse(response);
      
      // Validate and normalize the response
      return {
        score: {
          overall: Math.min(100, Math.max(0, analysis.score.overall)),
          skills: Math.min(100, Math.max(0, analysis.score.skills)),
          experience: Math.min(100, Math.max(0, analysis.score.experience)),
          education: Math.min(100, Math.max(0, analysis.score.education)),
          keywords: Math.min(100, Math.max(0, analysis.score.keywords))
        },
        matchedKeywords: Array.isArray(analysis.matchedKeywords) ? analysis.matchedKeywords : [],
        missingKeywords: Array.isArray(analysis.missingKeywords) ? analysis.missingKeywords : [],
        suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : []
      };
    } catch (error) {
      trace('ats-analyzer', 'error', 'Failed to parse AI response', { error });
      
      // Return a fallback analysis if parsing fails
      return {
        score: {
          overall: 0,
          skills: 0,
          experience: 0,
          education: 0,
          keywords: 0
        },
        matchedKeywords: [],
        missingKeywords: [],
        suggestions: ['Failed to analyze resume. Please try again.']
      };
    }
  } catch (error: any) {
    trace('ats-analyzer', 'error', 'ATS analysis failed', { error: error.message });
    throw error;
  }
}