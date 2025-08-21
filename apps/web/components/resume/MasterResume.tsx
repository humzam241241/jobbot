"use client";

import React from 'react';

interface ResumeSection {
  title: string;
  content: string | React.ReactNode;
}

export interface MasterResumeProps {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate?: string;
    highlights?: string[];
  }>;
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
  }>;
  customSections?: ResumeSection[];
  theme?: 'default' | 'professional' | 'modern' | 'minimal';
}

export const defaultResumeStyles = `
  .resume-container {
    font-family: 'Arial', sans-serif;
    color: #333;
    line-height: 1.5;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
  }
  .resume-header {
    text-align: center;
    margin-bottom: 20px;
  }
  .resume-name {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  .resume-contact {
    font-size: 14px;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 15px;
  }
  .resume-section {
    margin-bottom: 20px;
  }
  .resume-section-title {
    font-size: 16px;
    font-weight: bold;
    border-bottom: 1px solid #ccc;
    margin-bottom: 10px;
    padding-bottom: 5px;
  }
  .resume-summary {
    margin-bottom: 20px;
  }
  .resume-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .resume-skill {
    background-color: #f0f0f0;
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 13px;
  }
  .resume-experience-item, .resume-education-item, .resume-project-item {
    margin-bottom: 15px;
  }
  .resume-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  .resume-item-title {
    font-weight: bold;
  }
  .resume-item-subtitle {
    font-style: italic;
  }
  .resume-item-date {
    color: #666;
  }
  .resume-item-highlights {
    margin-top: 5px;
    padding-left: 20px;
  }
  .resume-item-highlight {
    margin-bottom: 3px;
  }
  
  /* Professional theme */
  .theme-professional {
    font-family: 'Georgia', serif;
  }
  .theme-professional .resume-section-title {
    color: #2c3e50;
    border-bottom: 2px solid #2c3e50;
  }
  .theme-professional .resume-item-title {
    color: #2c3e50;
  }
  
  /* Modern theme */
  .theme-modern {
    font-family: 'Helvetica', sans-serif;
  }
  .theme-modern .resume-section-title {
    color: #3498db;
    border-bottom: none;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .theme-modern .resume-skill {
    background-color: #3498db;
    color: white;
  }
  
  /* Minimal theme */
  .theme-minimal {
    font-family: 'Calibri', sans-serif;
  }
  .theme-minimal .resume-section-title {
    border-bottom: none;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .theme-minimal .resume-skill {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
  }
`;

export const MasterResume: React.FC<MasterResumeProps> = ({
  name,
  contact,
  summary,
  skills,
  experience,
  education,
  certifications = [],
  projects = [],
  customSections = [],
  theme = 'default'
}) => {
  const themeClass = theme !== 'default' ? `theme-${theme}` : '';
  
  return (
    <div className={`resume-container ${themeClass}`}>
      <style dangerouslySetInnerHTML={{ __html: defaultResumeStyles }} />
      
      <header className="resume-header">
        <h1 className="resume-name">{name}</h1>
        <div className="resume-contact">
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {contact.location && <span>{contact.location}</span>}
          {contact.linkedin && <span>{contact.linkedin}</span>}
          {contact.website && <span>{contact.website}</span>}
        </div>
      </header>
      
      <section className="resume-summary resume-section">
        <h2 className="resume-section-title">Professional Summary</h2>
        <p>{summary}</p>
      </section>
      
      <section className="resume-section">
        <h2 className="resume-section-title">Skills</h2>
        <div className="resume-skills">
          {skills.map((skill, index) => (
            <span key={index} className="resume-skill">{skill}</span>
          ))}
        </div>
      </section>
      
      <section className="resume-section">
        <h2 className="resume-section-title">Experience</h2>
        {experience.map((job, index) => (
          <div key={index} className="resume-experience-item">
            <div className="resume-item-header">
              <div>
                <div className="resume-item-title">{job.title}</div>
                <div className="resume-item-subtitle">{job.company}{job.location ? `, ${job.location}` : ''}</div>
              </div>
              <div className="resume-item-date">
                {job.startDate} – {job.endDate || 'Present'}
              </div>
            </div>
            <ul className="resume-item-highlights">
              {job.highlights.map((highlight, hIndex) => (
                <li key={hIndex} className="resume-item-highlight">{highlight}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      
      <section className="resume-section">
        <h2 className="resume-section-title">Education</h2>
        {education.map((edu, index) => (
          <div key={index} className="resume-education-item">
            <div className="resume-item-header">
              <div>
                <div className="resume-item-title">{edu.degree}</div>
                <div className="resume-item-subtitle">{edu.institution}{edu.location ? `, ${edu.location}` : ''}</div>
              </div>
              <div className="resume-item-date">
                {edu.startDate} – {edu.endDate || 'Present'}
              </div>
            </div>
            {edu.highlights && edu.highlights.length > 0 && (
              <ul className="resume-item-highlights">
                {edu.highlights.map((highlight, hIndex) => (
                  <li key={hIndex} className="resume-item-highlight">{highlight}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
      
      {certifications.length > 0 && (
        <section className="resume-section">
          <h2 className="resume-section-title">Certifications</h2>
          <ul className="resume-item-highlights">
            {certifications.map((cert, index) => (
              <li key={index} className="resume-item-highlight">{cert}</li>
            ))}
          </ul>
        </section>
      )}
      
      {projects.length > 0 && (
        <section className="resume-section">
          <h2 className="resume-section-title">Projects</h2>
          {projects.map((project, index) => (
            <div key={index} className="resume-project-item">
              <div className="resume-item-title">
                {project.name}
                {project.url && (
                  <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                    (<a href={project.url} target="_blank" rel="noopener noreferrer">Link</a>)
                  </span>
                )}
              </div>
              <p>{project.description}</p>
              {project.technologies && (
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Technologies: {project.technologies.join(', ')}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
      
      {customSections.map((section, index) => (
        <section key={index} className="resume-section">
          <h2 className="resume-section-title">{section.title}</h2>
          {typeof section.content === 'string' ? (
            <p>{section.content}</p>
          ) : (
            section.content
          )}
        </section>
      ))}
    </div>
  );
};

export default MasterResume;
