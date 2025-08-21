"use client";

import React from 'react';

export interface CoverLetterProps {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
  };
  date?: string;
  recipient?: {
    name?: string;
    title?: string;
    company?: string;
    address?: string;
  };
  greeting?: string;
  paragraphs: string[];
  closing?: string;
  signature?: string;
  theme?: 'default' | 'professional' | 'modern' | 'minimal';
}

export const defaultCoverLetterStyles = `
  .cover-letter-container {
    font-family: 'Arial', sans-serif;
    color: #333;
    line-height: 1.5;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
  }
  .cover-letter-sender {
    margin-bottom: 20px;
  }
  .cover-letter-date {
    margin-bottom: 20px;
  }
  .cover-letter-recipient {
    margin-bottom: 20px;
  }
  .cover-letter-greeting {
    margin-bottom: 20px;
  }
  .cover-letter-body p {
    margin-bottom: 15px;
    text-align: justify;
  }
  .cover-letter-closing {
    margin-top: 20px;
    margin-bottom: 10px;
  }
  .cover-letter-signature {
    margin-top: 30px;
  }
  
  /* Professional theme */
  .theme-professional {
    font-family: 'Georgia', serif;
  }
  
  /* Modern theme */
  .theme-modern {
    font-family: 'Helvetica', sans-serif;
  }
  .theme-modern .cover-letter-sender {
    text-align: center;
  }
  
  /* Minimal theme */
  .theme-minimal {
    font-family: 'Calibri', sans-serif;
  }
`;

export const CoverLetter: React.FC<CoverLetterProps> = ({
  name,
  contact,
  date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  recipient = {},
  greeting = 'Dear Hiring Manager,',
  paragraphs,
  closing = 'Sincerely,',
  signature,
  theme = 'default'
}) => {
  const themeClass = theme !== 'default' ? `theme-${theme}` : '';
  
  return (
    <div className={`cover-letter-container ${themeClass}`}>
      <style dangerouslySetInnerHTML={{ __html: defaultCoverLetterStyles }} />
      
      <div className="cover-letter-sender">
        <div>{name}</div>
        {contact.email && <div>{contact.email}</div>}
        {contact.phone && <div>{contact.phone}</div>}
        {contact.address && <div>{contact.address}</div>}
      </div>
      
      <div className="cover-letter-date">
        {date}
      </div>
      
      {(recipient.name || recipient.title || recipient.company || recipient.address) && (
        <div className="cover-letter-recipient">
          {recipient.name && <div>{recipient.name}</div>}
          {recipient.title && <div>{recipient.title}</div>}
          {recipient.company && <div>{recipient.company}</div>}
          {recipient.address && <div>{recipient.address}</div>}
        </div>
      )}
      
      <div className="cover-letter-greeting">
        {greeting}
      </div>
      
      <div className="cover-letter-body">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      
      <div className="cover-letter-closing">
        {closing}
      </div>
      
      <div className="cover-letter-signature">
        {signature || name}
      </div>
    </div>
  );
};

export default CoverLetter;
