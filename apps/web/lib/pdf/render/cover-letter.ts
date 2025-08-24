import { CoverLetter } from '../tailor/schema';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('cover-letter-renderer');

/**
 * Generates a cover letter as HTML
 */
export function generateCoverLetterHtml(coverLetter: CoverLetter): string {
  logger.info('Generating cover letter HTML');
  
  try {
    // Create HTML
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cover Letter</title>
      <style>
        @page {
          size: letter;
          margin: 1in;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 8.5in;
          margin: 0 auto;
        }
        .date {
          text-align: right;
          margin-bottom: 20px;
        }
        .recipient {
          margin-bottom: 20px;
        }
        .greeting {
          margin-bottom: 20px;
        }
        .content p {
          margin-bottom: 15px;
          text-align: justify;
        }
        .closing {
          margin-top: 20px;
          margin-bottom: 40px;
        }
        .signature {
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="date">
          ${coverLetter.date}
        </div>
        
        <div class="recipient">
          ${coverLetter.recipient.name || ''}
          ${coverLetter.recipient.name ? '<br>' : ''}
          ${coverLetter.recipient.title || ''}
          ${coverLetter.recipient.title ? '<br>' : ''}
          ${coverLetter.recipient.company}<br>
          ${coverLetter.recipient.address || ''}
        </div>
        
        <div class="greeting">
          ${coverLetter.greeting},
        </div>
        
        <div class="content">
          <p>${coverLetter.introduction}</p>
          ${coverLetter.body.map(paragraph => `<p>${paragraph}</p>`).join('')}
        </div>
        
        <div class="closing">
          ${coverLetter.closing},
        </div>
        
        <div class="signature">
          ${coverLetter.signature}
        </div>
      </div>
    </body>
    </html>
    `;
    
    logger.info('Cover letter HTML generated successfully');
    return html;
  } catch (error) {
    logger.error('Error generating cover letter HTML', { error });
    throw new Error('Failed to generate cover letter HTML: ' + error);
  }
}

/**
 * Saves a cover letter as HTML
 */
export function saveCoverLetterHtml(html: string, outputPath: string): void {
  logger.info('Saving cover letter HTML', { outputPath });
  
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(outputPath, html);
    
    logger.info('Cover letter HTML saved successfully');
  } catch (error) {
    logger.error('Error saving cover letter HTML', { error, outputPath });
    throw new Error('Failed to save cover letter HTML: ' + error);
  }
}

/**
 * Generates a cover letter from a tailored resume and job description
 */
export async function generateCoverLetterFromResume(
  tailoredResume: any,
  jobDescription: string,
  options?: {
    provider?: string;
    model?: string;
  }
): Promise<CoverLetter> {
  logger.info('Generating cover letter from resume', {
    provider: options?.provider || 'default',
    model: options?.model || 'default'
  });
  
  try {
    // Import the LLM module
    const { llm } = await import('@/lib/providers/llm');
    
    // Create the system prompt
    const systemPrompt = `
    You are an expert cover letter writer. Your task is to create a professional cover letter based on the provided resume and job description.
    
    IMPORTANT RULES:
    1. You MUST return a valid JSON object matching the schema provided below.
    2. The cover letter should be formal, professional, and personalized.
    3. Include specific examples from the resume that demonstrate relevant skills and experiences.
    4. Explain why the candidate is interested in the position and company.
    5. Keep the cover letter to one page (approximately 400-500 words).
    
    JSON SCHEMA:
    {
      "date": string,
      "recipient": {
        "name": string (optional),
        "title": string (optional),
        "company": string,
        "address": string (optional)
      },
      "greeting": string,
      "introduction": string,
      "body": string[],
      "closing": string,
      "signature": string
    }
    
    RETURN ONLY VALID JSON. NO PROSE.
    `;
    
    // Create the user prompt
    const userPrompt = `
    JOB DESCRIPTION:
    ${jobDescription}
    
    RESUME:
    ${JSON.stringify(tailoredResume, null, 2)}
    
    Please create a professional cover letter for this position. Return ONLY a valid JSON object according to the schema.
    `;
    
    // Call the LLM
    const response = await llm.complete({
      system: systemPrompt,
      user: userPrompt,
      model: options?.model || 'auto'
    });
    
    // Parse the response
    let coverLetter: CoverLetter;
    
    try {
      coverLetter = JSON.parse(response);
    } catch (parseError) {
      logger.error('Error parsing cover letter response', { error: parseError });
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          coverLetter = JSON.parse(jsonMatch[1]);
        } catch (extractError) {
          logger.error('Error parsing extracted JSON', { error: extractError });
          throw new Error('Failed to parse cover letter response');
        }
      } else {
        throw new Error('Failed to parse cover letter response');
      }
    }
    
    logger.info('Cover letter generated successfully');
    return coverLetter;
  } catch (error) {
    logger.error('Error generating cover letter', { error });
    
    // Return a fallback cover letter
    return createFallbackCoverLetter(tailoredResume, jobDescription);
  }
}

/**
 * Creates a fallback cover letter when LLM fails
 */
function createFallbackCoverLetter(
  resume: any,
  jobDescription: string
): CoverLetter {
  logger.info('Creating fallback cover letter');
  
  // Extract company name from job description
  const companyMatch = jobDescription.match(/(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&]+)(?:\.|\,|\s|$)/);
  const company = companyMatch ? companyMatch[1].trim() : 'the Company';
  
  // Extract position from job description
  const positionMatch = jobDescription.match(/(?:hiring|seeking|looking for|for the|position of)\s+(?:a|an)?\s+([A-Za-z0-9\s]+)(?:\.|\,|\s|$)/i);
  const position = positionMatch ? positionMatch[1].trim() : 'the Position';
  
  return {
    date: new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    recipient: {
      company
    },
    greeting: 'Dear Hiring Manager',
    introduction: `I am writing to express my interest in the ${position} position at ${company}.`,
    body: [
      `With my background and experience, I believe I am well-qualified for this role. My skills and experience align well with the requirements outlined in the job description.`,
      `Throughout my career, I have developed strong skills in problem-solving, communication, and teamwork. I am confident that I can make significant contributions to your team.`,
      `I am particularly drawn to ${company} because of its reputation for excellence and innovation in the industry. I am excited about the opportunity to bring my skills and experience to your organization.`
    ],
    closing: 'Sincerely',
    signature: resume.contact?.name || 'Applicant'
  };
}
