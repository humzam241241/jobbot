import type { LayoutConfig } from '../types/layout';
import type { NormalizedResume } from '@/lib/types/resume';

// Default layout configuration
const DEFAULT_CONFIG: LayoutConfig = {
  margins: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
  fonts: { base: 10.5, heading: 13 },
  spacing: {
    section: 1.0, // rem
    item: 0.6,    // rem
    bullet: 0.3,  // rem
    line: 1.4,
  },
};

const CHARS_PER_LINE = 90; // Approximate characters per line for an 8.5in page with 1in margins and 11pt font

// Dynamically adjust config based on content length and complexity
function adjustConfig(config: LayoutConfig, contentLength: number, numSections: number): LayoutConfig {
  const newConfig = JSON.parse(JSON.stringify(config));
  const estimatedLines = contentLength / CHARS_PER_LINE;
  const linesPerPage = 60; // Approximate lines on a standard page

  if (estimatedLines > linesPerPage * 1.1) { // Content is too long, shrink everything
    newConfig.fonts.base = Math.max(9.5, config.fonts.base - 0.5);
    newConfig.fonts.heading = Math.max(12, config.fonts.heading - 0.5);
    newConfig.spacing.line = Math.max(1.2, config.spacing.line - 0.1);
    newConfig.spacing.section = Math.max(0.8, config.spacing.section - 0.1);
    newConfig.margins.top = Math.max(0.4, config.margins.top - 0.05);
    newConfig.margins.bottom = Math.max(0.4, config.margins.bottom - 0.05);
  } else if (estimatedLines < linesPerPage * 0.8) { // Content is short, expand to fill space
    newConfig.fonts.base = Math.min(11.5, config.fonts.base + 0.5);
    newConfig.fonts.heading = Math.min(14, config.fonts.heading + 0.5);
    newConfig.spacing.line = Math.min(1.6, config.spacing.line + 0.1);
    newConfig.spacing.section = Math.min(1.2, config.spacing.section + 0.1);
    newConfig.margins.top = Math.min(0.75, config.margins.top + 0.1);
    newConfig.margins.bottom = Math.min(0.75, config.margins.bottom + 0.1);
  }

  // Final small adjustment based on number of sections (more sections need less vertical space)
  if (numSections > 5) {
    newConfig.spacing.section = Math.max(0.7, newConfig.spacing.section - 0.1);
  }

  return newConfig;
}

// Estimate total characters to help with layout optimization
function getContentLength(resume: NormalizedResume): number {
  let length = 0;
  length += resume.header.name?.length || 0;
  length += resume.summary?.length || 0;
  if (resume.skills) {
    length += Object.values(resume.skills).flat().join(', ').length;
  }
  resume.experience?.forEach(exp => {
    length += exp.bullets.join(' ').length;
  });
  resume.projects?.forEach(proj => {
    length += proj.bullets.join(' ').length;
  });
  return length;
}

export function optimizeLayout(resume: NormalizedResume): LayoutConfig {
  const contentLength = getContentLength(resume);
  const numSections = [
    resume.summary,
    resume.skills,
    resume.experience,
    resume.projects,
    resume.education,
  ].filter(Boolean).length;
  
  const bestConfig = adjustConfig(DEFAULT_CONFIG, contentLength, numSections);
  
  // Potential for future iteration: render to a headless browser,
  // measure the actual height, and re-adjust config. For now, heuristics are sufficient.
  console.log("Optimized layout config:", bestConfig);

  return bestConfig;
}

export function generateHtml(resume: NormalizedResume, config: LayoutConfig = DEFAULT_CONFIG): string {
  const { fonts, spacing, margins } = config;
  
  const contactLinks = resume.header.links?.map(link => `<a href="${link.url}">${link.label}</a>`).join(' · ');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${resume.header.name} - Resume</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
          
          /* Reset and base styles */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          /* Page setup */
          @page {
            size: 8.5in 11in;
            margin: ${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in;
          }
          
          body {
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            font-size: ${fonts.base}pt;
            line-height: ${spacing.line};
            color: #1a202c;
            background: white;
            width: 100%;
            height: 100%;
          }
          
          /* Main container */
          .resume {
            width: 100%;
            min-height: 100%;
          }
          
          /* Header section */
          .header {
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: ${spacing.item}rem;
            margin-bottom: ${spacing.section}rem;
          }
          
          .header h1 {
            font-size: ${fonts.heading + 4}pt;
            font-weight: 700;
            margin-bottom: 0.2rem;
          }
          
          .contact-info {
            font-size: ${fonts.base - 0.5}pt;
            color: #4a5568;
          }
          
          .contact-info a {
            color: #2b6cb0;
            text-decoration: none;
          }
          
          /* Section styling */
          .section {
            margin-bottom: ${spacing.section}rem;
          }
          
          .section-title {
            font-size: ${fonts.heading}pt;
            font-weight: 700;
            color: #2b6cb0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.2rem;
            margin-bottom: ${spacing.item}rem;
          }
          
          /* Summary section */
          .summary p {
            margin-bottom: ${spacing.item}rem;
          }
          
          /* Skills section */
          .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0 ${spacing.section}rem;
          }
          
          .skill-category-title {
            font-weight: 700;
            margin-bottom: ${spacing.bullet / 2}rem;
            color: #2d3748;
          }
          
          /* Experience and Education sections */
          .experience-item, .education-item {
            margin-bottom: ${spacing.item * 1.5}rem;
          }
          
          .experience-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: ${spacing.bullet}rem;
          }
          
          .experience-title {
            font-size: ${fonts.base + 1}pt;
            font-weight: 700;
          }
          
          .experience-org {
            font-weight: 500;
          }
          
          .experience-subtitle {
            font-size: ${fonts.base - 0.5}pt;
            font-style: italic;
            color: #718096;
          }
          
          /* Bullet lists */
          .bullet-list {
            list-style-position: outside;
            padding-left: 1.25rem;
          }
          
          .bullet-list li {
            margin-bottom: ${spacing.bullet}rem;
            position: relative;
          }
          
          /* Education section */
          .education-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          
          .education-degree {
            font-size: ${fonts.base + 1}pt;
            font-weight: 700;
          }
          
          .education-institution {
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="resume">
          <header class="header">
            <h1>${resume.header.name}</h1>
            <div class="contact-info">
              ${[resume.header.email, resume.header.phone, resume.header.location, contactLinks].filter(Boolean).join(' · ')}
            </div>
          </header>

          ${resume.summary ? `
            <section class="section summary">
              <h2 class="section-title">Summary</h2>
              <p>${resume.summary}</p>
            </section>
          ` : ''}

          ${resume.skills && Object.keys(resume.skills).length > 0 ? `
            <section class="section">
              <h2 class="section-title">Skills</h2>
              <div class="skills-grid">
                ${Object.entries(resume.skills).map(([category, skills]) => `
                  <div class="skill-category">
                    <div class="skill-category-title">${category}</div>
                    <p>${skills.join(', ')}</p>
                  </div>
                `).join('')}
              </div>
            </section>
          ` : ''}

          ${resume.experience && resume.experience.length > 0 ? `
            <section class="section">
              <h2 class="section-title">Experience</h2>
              ${resume.experience.map(exp => `
                <div class="experience-item">
                  <div class="experience-header">
                    <div>
                      <span class="experience-title">${exp.role}</span>, <span class="experience-org">${exp.organization}</span>
                    </div>
                    <div class="experience-subtitle">${exp.startDate} – ${exp.endDate || 'Present'}</div>
                  </div>
                  <ul class="bullet-list">
                    ${exp.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </section>
          ` : ''}

          ${resume.projects && resume.projects.length > 0 ? `
            <section class="section">
              <h2 class="section-title">Projects</h2>
              ${resume.projects.map(proj => `
                <div class="experience-item">
                  <div class="experience-header">
                    <div class="experience-title">${proj.name}</div>
                    ${proj.date ? `<div class="experience-subtitle">${proj.date}</div>` : ''}
                  </div>
                  <ul class="bullet-list">
                    ${proj.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </section>
          ` : ''}

          ${resume.education && resume.education.length > 0 ? `
            <section class="section">
              <h2 class="section-title">Education</h2>
              ${resume.education.map(edu => `
                <div class="education-item">
                  <div class="education-header">
                    <div>
                      <span class="education-degree">${edu.degree}</span>, <span class="education-institution">${edu.institution}</span>
                    </div>
                    <div class="experience-subtitle">${edu.dates}</div>
                  </div>
                  ${edu.details && edu.details.length > 0 ? `
                    <ul class="bullet-list">
                      ${edu.details.map(detail => `<li>${detail}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </section>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}
