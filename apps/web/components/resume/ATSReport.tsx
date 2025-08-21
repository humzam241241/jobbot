"use client";

import React from 'react';

export interface KeywordMatch {
  keyword: string;
  present: boolean;
  frequency?: number;
  importance: 'High' | 'Medium' | 'Low';
  suggestion?: string;
}

export interface ATSReportProps {
  name: string;
  jobTitle: string;
  company?: string;
  matchScore: number;
  summary: string;
  keywordMatches: KeywordMatch[];
  missingKeywords: Array<{
    keyword: string;
    suggestion: string;
  }>;
  skillsAssessment: {
    technical: string;
    soft: string;
    domain: string;
  };
  formatAssessment: {
    score: number;
    feedback: string;
  };
  contentSuggestions: string[];
  recommendations: string[];
  theme?: 'default' | 'professional' | 'modern' | 'minimal';
}

export const defaultATSReportStyles = `
  .ats-report-container {
    font-family: 'Arial', sans-serif;
    color: #333;
    line-height: 1.5;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
  }
  .ats-report-header {
    text-align: center;
    margin-bottom: 30px;
  }
  .ats-report-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .ats-report-subtitle {
    font-size: 16px;
    color: #666;
  }
  .ats-report-section {
    margin-bottom: 25px;
  }
  .ats-report-section-title {
    font-size: 18px;
    font-weight: bold;
    border-bottom: 1px solid #ccc;
    margin-bottom: 15px;
    padding-bottom: 5px;
  }
  .ats-report-match-score {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  .ats-report-score-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: conic-gradient(#4caf50 0% calc(var(--score) * 1%), #f0f0f0 calc(var(--score) * 1%) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20px;
    position: relative;
  }
  .ats-report-score-circle::before {
    content: '';
    position: absolute;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background-color: white;
  }
  .ats-report-score-text {
    position: relative;
    font-size: 20px;
    font-weight: bold;
    z-index: 1;
  }
  .ats-report-summary {
    flex: 1;
  }
  .ats-report-keywords-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  .ats-report-keywords-table th,
  .ats-report-keywords-table td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  .ats-report-keywords-table th {
    background-color: #f0f0f0;
  }
  .ats-report-keywords-table tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  .ats-report-present {
    color: #4caf50;
  }
  .ats-report-missing {
    color: #f44336;
  }
  .ats-report-importance-high {
    color: #f44336;
    font-weight: bold;
  }
  .ats-report-importance-medium {
    color: #ff9800;
  }
  .ats-report-importance-low {
    color: #2196f3;
  }
  .ats-report-missing-keywords {
    margin-bottom: 20px;
  }
  .ats-report-missing-keyword {
    margin-bottom: 10px;
  }
  .ats-report-missing-keyword-name {
    font-weight: bold;
  }
  .ats-report-skills-assessment {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 20px;
  }
  .ats-report-skills-card {
    background-color: #f9f9f9;
    border-radius: 5px;
    padding: 15px;
  }
  .ats-report-skills-card-title {
    font-weight: bold;
    margin-bottom: 10px;
    color: #333;
  }
  .ats-report-format-assessment {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  .ats-report-format-score {
    display: flex;
    align-items: center;
    margin-right: 20px;
  }
  .ats-report-format-score-dots {
    display: flex;
    margin-left: 10px;
  }
  .ats-report-format-score-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 5px;
  }
  .ats-report-format-score-dot-filled {
    background-color: #4caf50;
  }
  .ats-report-format-score-dot-empty {
    background-color: #f0f0f0;
  }
  .ats-report-content-suggestions {
    margin-bottom: 20px;
  }
  .ats-report-recommendations {
    background-color: #f0f7ff;
    border-left: 4px solid #2196f3;
    padding: 15px;
    margin-bottom: 20px;
  }
  .ats-report-recommendation {
    margin-bottom: 10px;
  }
  
  /* Professional theme */
  .theme-professional {
    font-family: 'Georgia', serif;
  }
  .theme-professional .ats-report-section-title {
    color: #2c3e50;
    border-bottom: 2px solid #2c3e50;
  }
  
  /* Modern theme */
  .theme-modern {
    font-family: 'Helvetica', sans-serif;
  }
  .theme-modern .ats-report-section-title {
    color: #3498db;
    border-bottom: none;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  /* Minimal theme */
  .theme-minimal {
    font-family: 'Calibri', sans-serif;
  }
  .theme-minimal .ats-report-section-title {
    border-bottom: none;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
`;

export const ATSReport: React.FC<ATSReportProps> = ({
  name,
  jobTitle,
  company,
  matchScore,
  summary,
  keywordMatches,
  missingKeywords,
  skillsAssessment,
  formatAssessment,
  contentSuggestions,
  recommendations,
  theme = 'default'
}) => {
  const themeClass = theme !== 'default' ? `theme-${theme}` : '';
  
  return (
    <div className={`ats-report-container ${themeClass}`}>
      <style dangerouslySetInnerHTML={{ __html: defaultATSReportStyles }} />
      
      <header className="ats-report-header">
        <h1 className="ats-report-title">ATS Optimization Report</h1>
        <div className="ats-report-subtitle">
          {name} | {jobTitle}{company ? ` at ${company}` : ''}
        </div>
      </header>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Executive Summary</h2>
        <div className="ats-report-match-score">
          <div 
            className="ats-report-score-circle" 
            style={{ '--score': matchScore } as React.CSSProperties}
          >
            <span className="ats-report-score-text">{matchScore}%</span>
          </div>
          <div className="ats-report-summary">
            <p>{summary}</p>
          </div>
        </div>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Keyword Analysis</h2>
        <table className="ats-report-keywords-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Present</th>
              <th>Frequency</th>
              <th>Importance</th>
              <th>Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {keywordMatches.map((keyword, index) => (
              <tr key={index}>
                <td>{keyword.keyword}</td>
                <td className={keyword.present ? "ats-report-present" : "ats-report-missing"}>
                  {keyword.present ? "Yes" : "No"}
                </td>
                <td>{keyword.frequency || 0}</td>
                <td className={`ats-report-importance-${keyword.importance.toLowerCase()}`}>
                  {keyword.importance}
                </td>
                <td>{keyword.suggestion || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Missing Critical Keywords</h2>
        <div className="ats-report-missing-keywords">
          {missingKeywords.map((keyword, index) => (
            <div key={index} className="ats-report-missing-keyword">
              <div className="ats-report-missing-keyword-name">{keyword.keyword}</div>
              <div>{keyword.suggestion}</div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Skills Assessment</h2>
        <div className="ats-report-skills-assessment">
          <div className="ats-report-skills-card">
            <div className="ats-report-skills-card-title">Technical Skills</div>
            <div>{skillsAssessment.technical}</div>
          </div>
          <div className="ats-report-skills-card">
            <div className="ats-report-skills-card-title">Soft Skills</div>
            <div>{skillsAssessment.soft}</div>
          </div>
          <div className="ats-report-skills-card">
            <div className="ats-report-skills-card-title">Domain Knowledge</div>
            <div>{skillsAssessment.domain}</div>
          </div>
        </div>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Resume Format & Structure</h2>
        <div className="ats-report-format-assessment">
          <div className="ats-report-format-score">
            <div>ATS-friendliness score:</div>
            <div className="ats-report-format-score-dots">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`ats-report-format-score-dot ${i < formatAssessment.score ? 'ats-report-format-score-dot-filled' : 'ats-report-format-score-dot-empty'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <p>{formatAssessment.feedback}</p>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Content Optimization</h2>
        <div className="ats-report-content-suggestions">
          <ul>
            {contentSuggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </section>
      
      <section className="ats-report-section">
        <h2 className="ats-report-section-title">Final Recommendations</h2>
        <div className="ats-report-recommendations">
          <ol>
            {recommendations.map((recommendation, index) => (
              <li key={index} className="ats-report-recommendation">{recommendation}</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
};

export default ATSReport;
