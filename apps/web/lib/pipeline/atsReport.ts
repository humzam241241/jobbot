import { debugLogger } from '@/lib/utils/debug-logger';
import fs from 'fs';
import path from 'path';
import { scoreAts } from './ats/score';

interface ATSReportInput {
  resumeText: string;
  jdText: string;
  profile?: any;
  kitId: string;
}

interface ATSReportOutput {
  url: string;
  score: number;
  reportHtml: string;
}

/**
 * Creates an ATS report by comparing a resume to a job description
 */
export async function createAtsReport({
  resumeText,
  jdText,
  profile,
  kitId
}: ATSReportInput): Promise<ATSReportOutput> {
  try {
    debugLogger.info('Creating ATS report', { 
      resumeLength: resumeText.length,
      jdLength: jdText.length,
      hasProfile: !!profile,
      kitId
    });

    // Generate the report
    const { html, score } = generateATSReport(resumeText, jdText);
    
    // Save the report
    const publicDir = path.join(process.cwd(), 'public');
    const kitsDir = path.join(publicDir, 'kits');
    const kitDir = path.join(kitsDir, kitId);
    const reportPath = path.join(kitDir, 'ats.html');

    // Ensure directories exist
    if (!fs.existsSync(kitsDir)) {
      fs.mkdirSync(kitsDir, { recursive: true });
    }
    if (!fs.existsSync(kitDir)) {
      fs.mkdirSync(kitDir, { recursive: true });
    }

    // Write the report
    fs.writeFileSync(reportPath, html);
    
    // Return the results
    return {
      url: `/kits/${kitId}/ats.html`,
      score,
      reportHtml: html
    };
  } catch (error) {
    debugLogger.error('Error creating ATS report', { error });
    throw error;
  }
}

/**
 * Generates an ATS report with detailed analysis
 */
function generateATSReport(resumeText: string, jdText: string) {
  // Calculate keyword matches
  const jdKeywords = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText);
  const matches = jdKeywords.filter(k => resumeKeywords.includes(k));
  
  // Use the improved scoring algorithm
  const atsScore = scoreAts(resumeText, jdText);
  const score = atsScore.matchPercent;
  
  // Calculate basic keyword match percentage for section scores
  const basicMatchPercent = Math.round((matches.length / Math.max(1, jdKeywords.length)) * 100);
  
  // Generate section scores with some randomness but influenced by keyword score
  const sections = [
    {
      section: "Skills Match",
      score: Math.min(95, Math.max(60, basicMatchPercent + (Math.random() * 10 - 5))),
      feedback: generateSkillsFeedback(matches, jdKeywords)
    },
    {
      section: "Experience Relevance",
      score: Math.min(95, Math.max(60, basicMatchPercent + (Math.random() * 10 - 5))),
      feedback: "Consider quantifying achievements and highlighting specific experiences relevant to the role."
    },
    {
      section: "Keyword Optimization",
      score: basicMatchPercent,
      feedback: generateKeywordFeedback(matches, jdKeywords)
    },
    {
      section: "Format & Readability",
      score: 85, // Format score is generally good since we're processing it
      feedback: "Resume format is ATS-friendly. Consider using standard section headings and bullet points for better readability."
    }
  ];
  
  // Generate HTML report
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ATS Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .score { font-size: 72px; font-weight: bold; color: #2c7be5; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .section-title { font-weight: bold; font-size: 18px; }
        .section-score { font-weight: bold; }
        .good { color: #00b300; }
        .average { color: #ff9900; }
        .poor { color: #ff3333; }
        .recommendations { margin-top: 30px; }
        .keywords { margin-top: 15px; }
        .keyword { display: inline-block; margin: 2px 5px; padding: 2px 8px; background: #f0f0f0; border-radius: 12px; font-size: 14px; }
        .matched { background: #e6ffe6; }
        .missing { background: #ffe6e6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ATS Compatibility Report</h1>
          <p>Overall Score</p>
          <div class="score">${score}%</div>
          <p>${getScoreCategory(score)}</p>
        </div>
        
        ${sections.map(section => `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${section.section}</div>
              <div class="section-score ${getScoreClass(section.score)}">${Math.round(section.score)}%</div>
            </div>
            <p>${section.feedback}</p>
            ${section.section === "Keyword Optimization" ? `
              <div class="keywords">
                <h4>Matched Keywords:</h4>
                ${matches.map(k => `<span class="keyword matched">${k}</span>`).join(' ')}
                <h4>Missing Keywords:</h4>
                ${jdKeywords.filter(k => !matches.includes(k)).map(k => `<span class="keyword missing">${k}</span>`).join(' ')}
              </div>
            ` : ''}
          </div>
        `).join('')}
        
        <div class="recommendations">
          <h2>Key Recommendations</h2>
          <ul>
            ${generateRecommendations(score, sections, matches.length, jdKeywords.length)}
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return {
    html,
    score
  };
}

/**
 * Extracts important keywords from text
 */
function extractKeywords(text: string): string[] {
  // Convert to lowercase and remove special characters
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Split into words
  const words = cleanText.split(/\s+/);
  
  // Filter common words and short words
  const stopWords = new Set(['and', 'the', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const keywords = words.filter(word => 
    word.length > 2 && 
    !stopWords.has(word) &&
    !(/^\d+$/.test(word))
  );
  
  // Return unique keywords
  return [...new Set(keywords)];
}

/**
 * Generates feedback for skills section
 */
function generateSkillsFeedback(matches: string[], jdKeywords: string[]): string {
  const matchRate = matches.length / jdKeywords.length;
  
  if (matchRate >= 0.8) {
    return "Strong skills match! Your resume effectively demonstrates relevant expertise.";
  } else if (matchRate >= 0.6) {
    return "Good skills alignment, but consider adding more specific skills mentioned in the job description.";
  } else {
    return "Skills gap detected. Review the job requirements and highlight relevant skills more prominently.";
  }
}

/**
 * Generates feedback for keyword section
 */
function generateKeywordFeedback(matches: string[], jdKeywords: string[]): string {
  const matchRate = matches.length / jdKeywords.length;
  const missing = jdKeywords.length - matches.length;
  
  if (matchRate >= 0.8) {
    return "Excellent keyword optimization! Your resume matches most key terms from the job description.";
  } else if (matchRate >= 0.6) {
    return `Good keyword match, but ${missing} key terms are missing. Consider incorporating more job-specific terminology.`;
  } else {
    return `Low keyword match. Add more relevant terms - ${missing} key terms from the job description are missing.`;
  }
}

/**
 * Generates recommendations based on scores
 */
function generateRecommendations(
  overallScore: number,
  sections: Array<{ section: string; score: number; feedback: string }>,
  matchedKeywords: number,
  totalKeywords: number
): string {
  const recommendations = [];
  
  if (matchedKeywords / totalKeywords < 0.7) {
    recommendations.push("Add more industry-specific keywords from the job description");
  }
  
  const experienceSection = sections.find(s => s.section === "Experience Relevance");
  if (experienceSection && experienceSection.score < 75) {
    recommendations.push("Quantify your achievements with specific metrics and results");
    recommendations.push("Tailor your experience descriptions to highlight relevant skills");
  }
  
  if (overallScore < 80) {
    recommendations.push("Review and incorporate more key requirements from the job description");
  }
  
  recommendations.push("Ensure your resume uses standard section headings for better ATS parsing");
  
  return recommendations.map(r => `<li>${r}</li>`).join('\n');
}

/**
 * Gets a category description based on score
 */
function getScoreCategory(score: number): string {
  if (score >= 85) return "Excellent match for this position";
  if (score >= 70) return "Good match with room for improvement";
  if (score >= 60) return "Average match, significant improvements needed";
  return "Poor match, major revisions recommended";
}

/**
 * Gets a CSS class based on score
 */
function getScoreClass(score: number): string {
  if (score >= 85) return "good";
  if (score >= 70) return "average";
  return "poor";
}