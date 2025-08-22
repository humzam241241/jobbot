"use client";

import React from 'react';
import { Profile } from '@/lib/schemas/profile';

interface CoverLetterProps {
  profile: Profile;
  content: string;
  jobTitle?: string;
  companyName?: string;
  className?: string;
}

export default function CoverLetter({ 
  profile, 
  content, 
  jobTitle = 'the position', 
  companyName = 'your company',
  className = '' 
}: CoverLetterProps) {
  // Format the date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Split content into paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <div className={`cover-letter-container ${className}`}>
      <div className="header">
        <div className="contact-info">
          <h1>{profile.name}</h1>
          {profile.email && <div>{profile.email}</div>}
          {profile.phone && <div>{profile.phone}</div>}
          {profile.website && <div>{profile.website}</div>}
          {profile.location && <div>{profile.location}</div>}
        </div>
        <div className="date">{formattedDate}</div>
      </div>

      <div className="recipient">
        <div>Hiring Manager</div>
        <div>{companyName}</div>
      </div>

      <div className="salutation">
        <p>Dear Hiring Manager,</p>
      </div>

      <div className="body">
        {paragraphs.map((paragraph, index) => {
          // Check if paragraph is a bullet list
          if (paragraph.includes('•') || paragraph.includes('-')) {
            const bullets = paragraph
              .split(/[•\-]/)
              .map(b => b.trim())
              .filter(b => b.length > 0);

            return (
              <div key={index} className="bullet-section">
                <ul>
                  {bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            );
          }
          
          return <p key={index}>{paragraph}</p>;
        })}
      </div>

      <div className="closing">
        <p>Sincerely,</p>
        <div className="signature">{profile.name}</div>
      </div>

      <style jsx>{`
        .cover-letter-container {
          font-family: 'Arial', sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.5;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .contact-info {
          text-align: left;
        }
        
        h1 {
          font-size: 24px;
          margin: 0 0 10px;
        }
        
        .date {
          text-align: right;
        }
        
        .recipient {
          margin-bottom: 20px;
        }
        
        .salutation {
          margin-bottom: 20px;
        }
        
        .body {
          margin-bottom: 30px;
        }
        
        p {
          margin-bottom: 15px;
        }
        
        .bullet-section {
          margin: 15px 0;
        }
        
        ul {
          margin: 0 0 15px 20px;
          padding: 0;
        }
        
        li {
          margin-bottom: 5px;
        }
        
        .closing {
          margin-top: 30px;
        }
        
        .signature {
          margin-top: 30px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}