// apps/web/lib/pipeline/atsReport.ts
import "server-only";

import { renderToPdf } from "./renderToPdf";
import type { Profile } from "@/lib/schemas/profile";

export type AtsInputs = { 
  resumeText: string; 
  jdText: string; 
  applicantName?: string;
  profile?: Profile;
};

export async function createAtsReport({ resumeText, jdText, applicantName, profile }: AtsInputs) {
  // Get tokens from the job description
  const jdTokens = tokenize(jdText);
  
  // Get tokens from the resume text as fallback
  const resTokens = tokenize(resumeText);
  
  // Get tokens from the profile if available (more accurate)
  let profileTokens = new Set<string>();
  if (profile) {
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
  }
  
  // Combine tokens from profile and resume text
  const combinedTokens = new Set([...resTokens, ...profileTokens]);
  
  // Find matching keywords
  const overlap = new Set([...jdTokens].filter(t => combinedTokens.has(t)));
  const score = Math.round((overlap.size / Math.max(1, jdTokens.size)) * 100);
  
  // Get the most important keywords from the job description
  const keywordImportance = calculateKeywordImportance(jdText);
  const sortedKeywords = [...overlap].sort((a, b) => 
    (keywordImportance[b] || 0) - (keywordImportance[a] || 0)
  );
  
  // Find missing important keywords
  const missingKeywords = [...jdTokens]
    .filter(t => !combinedTokens.has(t))
    .sort((a, b) => (keywordImportance[b] || 0) - (keywordImportance[a] || 0))
    .slice(0, 10);

  const html = `
    <h1>ATS Match Report${profile?.name ? `: ${escapeHtml(profile.name)}` : applicantName ? `: ${escapeHtml(applicantName)}` : ""}</h1>
    
    <div style="margin: 20px 0; padding: 15px; border: 1px solid #ccc; background-color: #f9f9f9;">
      <h2 style="margin-top: 0;">Match Score: ${score}%</h2>
      <div style="height: 20px; background-color: #eee; border-radius: 10px; overflow: hidden;">
        <div style="height: 100%; width: ${score}%; background-color: ${
          score >= 80 ? '#4CAF50' : 
          score >= 60 ? '#FFC107' : 
          '#F44336'
        };"></div>
      </div>
    </div>
    
    <h2>Keywords Found in Your Resume</h2>
    <p>These keywords from the job description were found in your resume:</p>
    <ul>${sortedKeywords.slice(0, 20).map(k => `<li>${escapeHtml(k)}</li>`).join("")}</ul>
    
    <h2>Missing Important Keywords</h2>
    <p>Consider adding these keywords to your resume if they apply to your experience:</p>
    <ul>${missingKeywords.map(k => `<li>${escapeHtml(k)}</li>`).join("")}</ul>
    
    <h2>Improvement Suggestions</h2>
    <ul>
      <li>Tailor your resume to include more keywords from the job description</li>
      <li>Use industry-standard terminology that ATS systems can recognize</li>
      <li>Ensure your skills section includes relevant technical skills mentioned in the job</li>
      <li>Quantify your achievements with metrics where possible</li>
    </ul>
  `;

  const { urlPath } = await renderToPdf({
    html,
    title: "ATS Report",
    fileName: `ats_report_${Date.now()}.pdf`,
  });

  return { url: urlPath, score };
}

function tokenize(s: string) {
  return new Set((s || "").toLowerCase().match(/[a-z0-9\+#\.]{2,}/g) || []);
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Calculate keyword importance based on frequency and position in the job description
function calculateKeywordImportance(text: string): Record<string, number> {
  const tokens = (text || "").toLowerCase().match(/[a-z0-9\+#\.]{2,}/g) || [];
  const importance: Record<string, number> = {};
  
  // Count frequency
  tokens.forEach((token, index) => {
    // Words at the beginning get higher importance
    const positionWeight = Math.max(1, 2 - (index / tokens.length));
    importance[token] = (importance[token] || 0) + (1 * positionWeight);
  });
  
  return importance;
}