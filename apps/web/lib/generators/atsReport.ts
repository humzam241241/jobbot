import { renderToPdf } from "@/lib/pipeline/renderToPdf";
import { Profile } from "@/lib/schemas/profile";

/**
 * Analyzes the match between a profile and job description
 * @param profile The profile to analyze
 * @param jobDescription The job description to match against
 * @returns Analysis results including score and keywords
 */
function analyzeAtsMatch(profile: Profile, jobDescription: string) {
  // Extract keywords from job description
  const jdTokens = tokenize(jobDescription);
  
  // Extract keywords from profile
  const profileTokens = new Set<string>();
  
  // Add skills
  profile.skills.forEach(skill => {
    tokenize(skill).forEach(token => profileTokens.add(token));
  });
  
  // Add experience bullet points
  profile.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      tokenize(bullet).forEach(token => profileTokens.add(token));
    });
    // Add job titles and companies
    tokenize(exp.title).forEach(token => profileTokens.add(token));
    tokenize(exp.company).forEach(token => profileTokens.add(token));
  });
  
  // Add education
  profile.education.forEach(edu => {
    if (edu.degree) tokenize(edu.degree).forEach(token => profileTokens.add(token));
    if (edu.field) tokenize(edu.field).forEach(token => profileTokens.add(token));
    tokenize(edu.school).forEach(token => profileTokens.add(token));
  });
  
  // Add summary if available
  if (profile.summary) {
    tokenize(profile.summary).forEach(token => profileTokens.add(token));
  }
  
  // Find matching keywords
  const matchingKeywords = [...jdTokens].filter(token => profileTokens.has(token));
  
  // Calculate score
  const score = Math.round((matchingKeywords.length / Math.max(1, jdTokens.size)) * 100);
  
  // Calculate keyword importance
  const keywordImportance = calculateKeywordImportance(jobDescription);
  
  // Sort keywords by importance
  const sortedMatchingKeywords = matchingKeywords.sort((a, b) => 
    (keywordImportance[b] || 0) - (keywordImportance[a] || 0)
  );
  
  // Find missing important keywords
  const missingKeywords = [...jdTokens]
    .filter(token => !profileTokens.has(token))
    .sort((a, b) => (keywordImportance[b] || 0) - (keywordImportance[a] || 0))
    .slice(0, 10);
  
  return {
    score,
    matchingKeywords: sortedMatchingKeywords.slice(0, 20),
    missingKeywords,
  };
}

/**
 * Tokenizes text into individual keywords
 * @param text The text to tokenize
 * @returns A set of tokens
 */
function tokenize(text: string): Set<string> {
  // Convert to lowercase and extract words (2+ chars)
  const tokens = (text || "").toLowerCase().match(/[a-z0-9\+#\.]{2,}/g) || [];
  
  // Filter out common words
  const commonWords = new Set([
    "the", "and", "for", "with", "this", "that", "have", "from", "not", "are", "was", "were",
    "will", "would", "should", "could", "been", "being", "has", "had", "may", "might", "must",
    "can", "about", "into", "such", "than", "then", "them", "these", "those", "their", "there"
  ]);
  
  return new Set(tokens.filter(token => !commonWords.has(token)));
}

/**
 * Calculates the importance of keywords in a job description
 * @param text The job description text
 * @returns A map of keywords to importance scores
 */
function calculateKeywordImportance(text: string): Record<string, number> {
  const tokens = (text || "").toLowerCase().match(/[a-z0-9\+#\.]{2,}/g) || [];
  const importance: Record<string, number> = {};
  
  // Count frequency and position weight
  tokens.forEach((token, index) => {
    // Words at the beginning get higher importance
    const positionWeight = Math.max(1, 2 - (index / tokens.length));
    importance[token] = (importance[token] || 0) + (1 * positionWeight);
  });
  
  return importance;
}

/**
 * Escapes HTML special characters
 * @param text The text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates an ATS report for a profile and job description
 * @param tailoredProfile The tailored profile
 * @param jobDescription The job description
 * @returns Object with the report URL and score
 */
export async function generateAtsReport({
  tailoredProfile,
  jobDescription
}: {
  tailoredProfile: Profile;
  jobDescription: string;
}) {
  // Analyze the match
  const analysis = analyzeAtsMatch(tailoredProfile, jobDescription);
  
  // Generate the HTML
  const html = `
    <style>
      body {
        font-family: 'Arial', sans-serif;
        line-height: 1.5;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      
      h1 {
        color: #2563eb;
        margin-bottom: 20px;
      }
      
      h2 {
        color: #4b5563;
        margin-top: 30px;
        margin-bottom: 15px;
      }
      
      .score-container {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
      }
      
      .score {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      
      .progress-bar {
        height: 20px;
        background-color: #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background-color: ${
          analysis.score >= 80 ? '#10b981' : 
          analysis.score >= 60 ? '#f59e0b' : 
          '#ef4444'
        };
      }
      
      ul {
        margin-top: 10px;
      }
      
      li {
        margin-bottom: 5px;
      }
      
      .suggestions {
        background-color: #eff6ff;
        border: 1px solid #dbeafe;
        border-radius: 8px;
        padding: 20px;
        margin-top: 30px;
      }
      
      .suggestions h2 {
        margin-top: 0;
        color: #2563eb;
      }
    </style>
    
    <h1>ATS Match Report${tailoredProfile.name ? `: ${escapeHtml(tailoredProfile.name)}` : ""}</h1>
    
    <div class="score-container">
      <div class="score">Match Score: ${analysis.score}%</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${analysis.score}%"></div>
      </div>
    </div>
    
    <h2>Keywords Found in Your Resume</h2>
    <p>These keywords from the job description were found in your resume:</p>
    <ul>
      ${analysis.matchingKeywords.map(keyword => `<li>${escapeHtml(keyword)}</li>`).join("")}
    </ul>
    
    <h2>Missing Important Keywords</h2>
    <p>Consider adding these keywords to your resume if they apply to your experience:</p>
    <ul>
      ${analysis.missingKeywords.map(keyword => `<li>${escapeHtml(keyword)}</li>`).join("")}
    </ul>
    
    <div class="suggestions">
      <h2>Improvement Suggestions</h2>
      <ul>
        <li>Tailor your resume to include more keywords from the job description</li>
        <li>Use industry-standard terminology that ATS systems can recognize</li>
        <li>Ensure your skills section includes relevant technical skills mentioned in the job</li>
        <li>Quantify your achievements with metrics where possible</li>
        <li>Use action verbs at the beginning of bullet points</li>
        <li>Focus on results and impact in your experience descriptions</li>
      </ul>
    </div>
  `;
  
  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `ats_report_${timestamp}.pdf`;
  
  // Render the PDF
  const { urlPath } = await renderToPdf({
    html,
    title: "ATS Report",
    fileName,
  });
  
  return { url: urlPath, score: analysis.score };
}
