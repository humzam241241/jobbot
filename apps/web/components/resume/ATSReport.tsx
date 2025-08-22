"use client";

import React from 'react';
import { Profile } from '@/lib/schemas/profile';

interface ATSReportProps {
  profile: Profile;
  score: number;
  matchingKeywords: string[];
  missingKeywords: string[];
  jobTitle?: string;
  companyName?: string;
  className?: string;
}

export default function ATSReport({
  profile,
  score,
  matchingKeywords,
  missingKeywords,
  jobTitle = 'the position',
  companyName = 'the company',
  className = ''
}: ATSReportProps) {
  // Get the score color
  const getScoreColor = () => {
    if (score >= 80) return '#10b981'; // emerald-500
    if (score >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className={`ats-report-container ${className}`}>
      <header>
        <h1>ATS Match Report</h1>
        <h2>{profile.name}</h2>
        {jobTitle && companyName && (
          <p className="job-info">
            {jobTitle} at {companyName}
          </p>
        )}
      </header>

      <div className="score-section">
        <h2>Match Score: {score}%</h2>
        <div className="score-bar-container">
          <div 
            className="score-bar-fill"
            style={{ 
              width: `${score}%`,
              backgroundColor: getScoreColor()
            }}
          ></div>
        </div>
        <p className="score-description">
          {score >= 80 ? (
            'Excellent match! Your resume is well-aligned with this job description.'
          ) : score >= 60 ? (
            'Good match. With some adjustments, your resume could be even more competitive.'
          ) : (
            'Your resume needs significant tailoring to better match this job description.'
          )}
        </p>
      </div>

      <div className="keywords-section">
        <div className="matching-keywords">
          <h2>Keywords Found in Your Resume</h2>
          <p>These keywords from the job description were found in your resume:</p>
          <ul className="keyword-list">
            {matchingKeywords.map((keyword, index) => (
              <li key={index} className="keyword-item matching">{keyword}</li>
            ))}
          </ul>
        </div>

        <div className="missing-keywords">
          <h2>Missing Important Keywords</h2>
          <p>Consider adding these keywords to your resume if they apply to your experience:</p>
          <ul className="keyword-list">
            {missingKeywords.map((keyword, index) => (
              <li key={index} className="keyword-item missing">{keyword}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="recommendations">
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

      <style jsx>{`
        .ats-report-container {
          font-family: 'Arial', sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.5;
        }
        
        header {
          margin-bottom: 30px;
          text-align: center;
        }
        
        h1 {
          font-size: 24px;
          margin: 0 0 10px;
          color: #2563eb;
        }
        
        h2 {
          font-size: 18px;
          margin: 0 0 15px;
        }
        
        .job-info {
          font-style: italic;
          color: #555;
        }
        
        .score-section {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .score-bar-container {
          height: 20px;
          background-color: #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          margin: 15px 0;
        }
        
        .score-bar-fill {
          height: 100%;
          transition: width 1s ease-in-out;
        }
        
        .score-description {
          font-weight: 500;
        }
        
        .keywords-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .matching-keywords, .missing-keywords {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }
        
        .keyword-list {
          list-style: none;
          padding: 0;
          margin: 15px 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .keyword-item {
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 14px;
        }
        
        .matching {
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .missing {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .recommendations {
          background-color: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          padding: 20px;
        }
        
        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .recommendations li {
          margin-bottom: 8px;
        }
        
        @media (max-width: 768px) {
          .keywords-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}