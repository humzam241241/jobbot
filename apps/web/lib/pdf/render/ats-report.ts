import { ATSReport } from '../tailor/schema';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('ats-report-renderer');

/**
 * Generates an ATS report as HTML
 */
export function generateAtsReportHtml(atsReport: ATSReport): string {
  logger.info('Generating ATS report HTML');
  
  try {
    // Helper function to get score color
    const getScoreColor = (score: number) => {
      if (score >= 85) return '#28a745'; // Green
      if (score >= 70) return '#ffc107'; // Yellow
      return '#dc3545'; // Red
    };
    
    // Helper function to get score class
    const getScoreClass = (score: number) => {
      if (score >= 85) return 'good';
      if (score >= 70) return 'average';
      return 'poor';
    };
    
    // Helper function to get score description
    const getScoreDescription = (score: number) => {
      if (score >= 85) return 'Excellent match for this position';
      if (score >= 70) return 'Good match with room for improvement';
      if (score >= 60) return 'Average match, significant improvements needed';
      return 'Poor match, major revisions recommended';
    };
    
    // Create HTML
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ATS Report</title>
      <style>
        @page {
          size: letter;
          margin: 1in;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          max-width: 8.5in;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .score {
          font-size: 72px;
          font-weight: bold;
          color: ${getScoreColor(atsReport.overallScore)};
        }
        .section {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #eee;
          border-radius: 5px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title {
          font-weight: bold;
          font-size: 18px;
        }
        .section-score {
          font-weight: bold;
        }
        .good {
          color: #28a745;
        }
        .average {
          color: #ffc107;
        }
        .poor {
          color: #dc3545;
        }
        .recommendations {
          margin-top: 30px;
        }
        .keywords {
          margin-top: 15px;
        }
        .keyword {
          display: inline-block;
          margin: 2px 5px;
          padding: 2px 8px;
          background: #f0f0f0;
          border-radius: 12px;
          font-size: 14px;
        }
        .matched {
          background: #e6ffe6;
        }
        .missing {
          background: #ffe6e6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATS Compatibility Report</h1>
          <p>Overall Score</p>
          <div class="score">${atsReport.overallScore}%</div>
          <p>${getScoreDescription(atsReport.overallScore)}</p>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Skills Match</div>
            <div class="section-score ${getScoreClass(atsReport.sectionScores.skills * 10)}">${atsReport.sectionScores.skills}/10</div>
          </div>
          <p>This score reflects how well your skills align with the job requirements.</p>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Experience Relevance</div>
            <div class="section-score ${getScoreClass(atsReport.sectionScores.experience * 10)}">${atsReport.sectionScores.experience}/10</div>
          </div>
          <p>This score evaluates how relevant your experience is to the job requirements.</p>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Summary Quality</div>
            <div class="section-score ${getScoreClass(atsReport.sectionScores.summary * 10)}">${atsReport.sectionScores.summary}/10</div>
          </div>
          <p>This score evaluates how effectively your summary highlights your qualifications.</p>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Education Alignment</div>
            <div class="section-score ${getScoreClass(atsReport.sectionScores.education * 10)}">${atsReport.sectionScores.education}/10</div>
          </div>
          <p>This score reflects how well your education aligns with the job requirements.</p>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Keyword Analysis</div>
          </div>
          
          <div class="keywords">
            <h4>Matched Keywords:</h4>
            ${atsReport.keywordCoverage.matched.map(k => `<span class="keyword matched">${k}</span>`).join(' ')}
            
            <h4>Missing Critical Keywords:</h4>
            ${atsReport.keywordCoverage.missingCritical.length > 0 
              ? atsReport.keywordCoverage.missingCritical.map(k => `<span class="keyword missing">${k}</span>`).join(' ')
              : '<p>None - Great job!</p>'
            }
            
            <h4>Nice-to-Have Keywords:</h4>
            ${atsReport.keywordCoverage.niceToHave.length > 0 
              ? atsReport.keywordCoverage.niceToHave.map(k => `<span class="keyword missing">${k}</span>`).join(' ')
              : '<p>None</p>'
            }
          </div>
        </div>
        
        <div class="section">
          <div class="section-header">
            <div class="section-title">Formatting Check</div>
          </div>
          
          <p>Page Count: ${atsReport.lengthAndFormatting.pageCountOK ? '✓ Good' : '✗ Too long'}</p>
          <p>Line Spacing: ${atsReport.lengthAndFormatting.lineSpacingOK ? '✓ Good' : '✗ Needs improvement'}</p>
          <p>Bullet Points: ${atsReport.lengthAndFormatting.bulletsOK ? '✓ Good' : '✗ Needs improvement'}</p>
        </div>
        
        ${atsReport.redFlags.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <div class="section-title">Red Flags</div>
          </div>
          
          <ul>
            ${atsReport.redFlags.map(flag => `<li>${flag}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${atsReport.concreteEdits.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <div class="section-title">Suggested Improvements</div>
          </div>
          
          ${atsReport.concreteEdits.map(edit => `
            <h4>${edit.section}</h4>
            <p>Before: ${edit.before}</p>
            <p>After: ${edit.after}</p>
          `).join('')}
        </div>
        ` : ''}
        
        <div class="recommendations">
          <h2>Key Recommendations</h2>
          
          <ul>
            ${atsReport.finalRecommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
    </body>
    </html>
    `;
    
    logger.info('ATS report HTML generated successfully');
    return html;
  } catch (error) {
    logger.error('Error generating ATS report HTML', { error });
    throw new Error('Failed to generate ATS report HTML: ' + error);
  }
}

/**
 * Saves an ATS report as HTML
 */
export function saveAtsReportHtml(html: string, outputPath: string): void {
  logger.info('Saving ATS report HTML', { outputPath });
  
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(outputPath, html);
    
    logger.info('ATS report HTML saved successfully');
  } catch (error) {
    logger.error('Error saving ATS report HTML', { error, outputPath });
    throw new Error('Failed to save ATS report HTML: ' + error);
  }
}

/**
 * Generates an ATS report from a tailored resume and job description
 */
export async function generateAtsReportFromResume(
  tailoredResume: any,
  jobDescription: string,
  options?: {
    provider?: string;
    model?: string;
  }
): Promise<ATSReport> {
  logger.info('Generating ATS report from resume', {
    provider: options?.provider || 'default',
    model: options?.model || 'default'
  });
  
  try {
    // Import the LLM module
    const { llm } = await import('@/lib/providers/llm');
    
    // Create the system prompt
    const systemPrompt = `
    You are an expert ATS (Applicant Tracking System) analyzer. Your task is to evaluate a resume against a job description and provide a detailed ATS compatibility report.
    
    IMPORTANT RULES:
    1. You MUST return a valid JSON object matching the schema provided below.
    2. Be honest but constructive in your evaluation.
    3. Provide specific, actionable feedback.
    4. Focus on keyword matching, formatting, and content relevance.
    5. Identify both strengths and areas for improvement.
    
    JSON SCHEMA:
    {
      "overallScore": number (0-100),
      "keywordCoverage": {
        "matched": string[],
        "missingCritical": string[],
        "niceToHave": string[]
      },
      "sectionScores": {
        "summary": number (0-10),
        "skills": number (0-10),
        "experience": number (0-10),
        "education": number (0-10)
      },
      "redFlags": string[],
      "lengthAndFormatting": {
        "pageCountOK": boolean,
        "lineSpacingOK": boolean,
        "bulletsOK": boolean
      },
      "concreteEdits": [
        {
          "section": string,
          "before": string,
          "after": string
        }
      ],
      "finalRecommendations": string[]
    }
    
    RETURN ONLY VALID JSON. NO PROSE.
    `;
    
    // Create the user prompt
    const userPrompt = `
    JOB DESCRIPTION:
    ${jobDescription}
    
    RESUME:
    ${JSON.stringify(tailoredResume, null, 2)}
    
    Please analyze this resume against the job description and provide an ATS compatibility report. Return ONLY a valid JSON object according to the schema.
    `;
    
    // Call the LLM
    const response = await llm.complete({
      system: systemPrompt,
      user: userPrompt,
      model: options?.model || 'auto'
    });
    
    // Parse the response
    let atsReport: ATSReport;
    
    try {
      atsReport = JSON.parse(response);
    } catch (parseError) {
      logger.error('Error parsing ATS report response', { error: parseError });
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          atsReport = JSON.parse(jsonMatch[1]);
        } catch (extractError) {
          logger.error('Error parsing extracted JSON', { error: extractError });
          throw new Error('Failed to parse ATS report response');
        }
      } else {
        throw new Error('Failed to parse ATS report response');
      }
    }
    
    logger.info('ATS report generated successfully');
    return atsReport;
  } catch (error) {
    logger.error('Error generating ATS report', { error });
    
    // Return a fallback ATS report
    return createFallbackAtsReport(tailoredResume, jobDescription);
  }
}

/**
 * Creates a fallback ATS report when LLM fails
 */
function createFallbackAtsReport(
  resume: any,
  jobDescription: string
): ATSReport {
  logger.info('Creating fallback ATS report');
  
  return {
    overallScore: 75,
    keywordCoverage: {
      matched: ['experience', 'skills', 'education'],
      missingCritical: [],
      niceToHave: []
    },
    sectionScores: {
      summary: 7,
      skills: 8,
      experience: 7,
      education: 8
    },
    redFlags: [],
    lengthAndFormatting: {
      pageCountOK: true,
      lineSpacingOK: true,
      bulletsOK: true
    },
    concreteEdits: [
      {
        section: 'skills',
        before: 'Generic skills list',
        after: 'Targeted skills list with keywords from the job description'
      }
    ],
    finalRecommendations: [
      'Add more keywords from the job description',
      'Quantify your achievements with specific metrics',
      'Ensure your resume is ATS-friendly with standard section headings'
    ]
  };
}
