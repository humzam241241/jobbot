"use client";

import React from 'react';
import { Profile } from '@/lib/schemas/profile';

interface MasterResumeProps {
  profile: Profile;
  className?: string;
}

export default function MasterResume({ profile, className = '' }: MasterResumeProps) {
  return (
    <div className={`resume-container ${className}`}>
      <header>
        <h1>{profile.name}</h1>
        <div className="contact-info">
          {profile.email && <div>{profile.email}</div>}
          {profile.phone && <div>{profile.phone}</div>}
          {profile.website && <div>{profile.website}</div>}
          {profile.location && <div>{profile.location}</div>}
        </div>
      </header>

      {profile.summary && (
        <section className="summary">
          <h2>Summary</h2>
          <p>{profile.summary}</p>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="skills">
          <h2>Skills</h2>
          <div className="skills-list">
            {profile.skills.join(', ')}
          </div>
        </section>
      )}

      {profile.experience.length > 0 && (
        <section className="experience">
          <h2>Experience</h2>
          {profile.experience.map((exp, index) => (
            <div key={index} className="experience-item">
              <div className="job-header">
                <h3>{exp.title}</h3>
                <div className="company">{exp.company}</div>
                <div className="job-meta">
                  {exp.location && <span className="location">{exp.location}</span>}
                  {exp.startDate && (
                    <span className="dates">
                      {exp.startDate}
                      {exp.endDate ? ` - ${exp.endDate}` : ' - Present'}
                    </span>
                  )}
                </div>
              </div>
              {exp.bullets.length > 0 && (
                <ul className="bullets">
                  {exp.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {profile.education.length > 0 && (
        <section className="education">
          <h2>Education</h2>
          {profile.education.map((edu, index) => (
            <div key={index} className="education-item">
              <h3>{edu.school}</h3>
              <div className="degree-info">
                {edu.degree && <span className="degree">{edu.degree}</span>}
                {edu.field && <span className="field">{edu.field}</span>}
              </div>
              <div className="education-meta">
                {edu.startDate && (
                  <span className="dates">
                    {edu.startDate}
                    {edu.endDate ? ` - ${edu.endDate}` : ' - Present'}
                  </span>
                )}
                {edu.gpa && <span className="gpa">GPA: {edu.gpa}</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      <style jsx>{`
        .resume-container {
          font-family: 'Arial', sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          line-height: 1.5;
        }
        
        header {
          margin-bottom: 20px;
          text-align: center;
        }
        
        h1 {
          font-size: 24px;
          margin: 0 0 10px;
        }
        
        h2 {
          font-size: 18px;
          border-bottom: 1px solid #ccc;
          margin: 20px 0 10px;
          padding-bottom: 5px;
        }
        
        h3 {
          font-size: 16px;
          margin: 0;
        }
        
        .contact-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 15px;
          font-size: 14px;
        }
        
        section {
          margin-bottom: 20px;
        }
        
        .experience-item, .education-item {
          margin-bottom: 15px;
        }
        
        .job-header, .degree-info {
          margin-bottom: 5px;
        }
        
        .company, .degree {
          font-weight: bold;
        }
        
        .job-meta, .education-meta {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #555;
          margin-bottom: 5px;
        }
        
        ul.bullets {
          margin: 5px 0 0 20px;
          padding: 0;
        }
        
        li {
          margin-bottom: 3px;
        }
      `}</style>
    </div>
  );
}