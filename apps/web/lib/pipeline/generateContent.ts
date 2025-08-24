import "server-only";
import { debugLogger } from '@/lib/utils/debug-logger';
import { callWithFallback } from '@/lib/llm/providers/fallback';
import { safeComposeUserPayload } from '@/lib/extract/prepare-payload';
import fs from 'fs';
import path from 'path';

export interface GenerateContentOptions {
  resumeOriginalText: string;
  jdText: string;
  jdUrl?: string;
  modelHint?: string;
  provider?: string;
  profile?: any;
  kitId: string;
}

export interface GenerateContentResult {
  resumeHtml: string;
  coverHtml: string;
}

const SYSTEM_RECRUITER = `You are a technical recruiter at a fast-growing startup.
Your goal is to help candidates present their experience effectively.
Focus on:
- Results and impact
- Clear, measurable outcomes
- Business value of technical work
- Transferable skills from any role
- Action verbs and concrete achievements
- Professional formatting with bullet points
- Intelligent use of bold for emphasis`;

/**
 * Generates tailored resume and cover letter content
 */
export async function generateContent({
  resumeOriginalText,
  jdText,
  jdUrl,
  modelHint,
  provider,
  profile,
  kitId
}: GenerateContentOptions): Promise<GenerateContentResult> {
  try {
    debugLogger.info('Starting content generation', { 
      resumeLength: resumeOriginalText.length,
      jdLength: jdText.length,
      hasProfile: !!profile,
      kitId
    });

    // Try LLM path first (guarded); fallback to mock
    let resumeHtml: string | null = null;
    let coverHtml: string | null = null;

    try {
      const schemaJson = { 
        version: 1,
        fields: ["header","summary","skills","experience","projects","education"]
      };
      const system = SYSTEM_RECRUITER + "\nReturn either valid JSON strictly matching the schema fields or plain text if unable.";
      const userPayload = safeComposeUserPayload(schemaJson, resumeOriginalText, jdText);
      const providerLabel = (provider as any) || 'Google';
      const modelLabel = modelHint || 'Gemini 2.5 Pro';

      const llm = await callWithFallback({ provider: providerLabel as any, modelLabel, system, userPayload, maxOutputTokens: 2000 });
      if ((llm as any).ok) {
        const text = (llm as any).text as string;
        try {
          const parsed = JSON.parse(text);
          resumeHtml = generateResumeHtml(parsed || profile || {}, jdText);
          coverHtml = generateCoverLetterHtml(parsed || profile || {}, jdText);
          debugLogger.info('LLM content used', { kitId, providerUsed: (llm as any).provider });
        } catch {
          // Treat as freeform text; wrap minimally
          const pseudo = { ...profile, summary: text.slice(0, 1500) };
          resumeHtml = generateResumeHtml(pseudo, jdText);
          coverHtml = generateCoverLetterHtml(pseudo, jdText);
          debugLogger.warn('LLM returned non-JSON; used fallback wrapping', { kitId });
        }
      } else {
        debugLogger.warn('LLM fallback path activated', { kitId, errors: (llm as any).errors });
      }
    } catch (e) {
      debugLogger.error('LLM content generation failed', { kitId, error: e instanceof Error ? e.message : String(e) });
    }

    // Ensure we have content
    if (!resumeHtml || !coverHtml) {
      resumeHtml = generateResumeHtml(profile || {}, jdText);
      coverHtml = generateCoverLetterHtml(profile || {}, jdText);
    }
    
    // Save the files
    const publicDir = path.join(process.cwd(), 'public');
    const kitsDir = path.join(publicDir, 'kits');
    const kitDir = path.join(kitsDir, kitId);
    
    // Ensure directories exist
    if (!fs.existsSync(kitsDir)) {
      fs.mkdirSync(kitsDir, { recursive: true });
    }
    if (!fs.existsSync(kitDir)) {
      fs.mkdirSync(kitDir, { recursive: true });
    }

    // Write the files
    fs.writeFileSync(path.join(kitDir, 'resume.html'), resumeHtml);
    fs.writeFileSync(path.join(kitDir, 'cover-letter.html'), coverHtml);
    
    debugLogger.info('Content generation complete', { kitId });

    return {
      resumeHtml,
      coverHtml
    };
  } catch (error) {
    debugLogger.error('Content generation failed', { error });
    throw error;
  }
}

/**
 * Extracts keywords from text
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
 * Highlights keywords in text
 */
function highlightKeywords(text: string, keywords: string[]): string {
  let result = text;
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    result = result.replace(regex, `<span class="highlight">$&</span>`);
  });
  return result;
}

/**
 * Generates resume HTML
 */
function generateResumeHtml(profile: any, jobDescription: string): string {
  const name = profile.name || 'Candidate Name';
  const email = profile.email || 'candidate@example.com';
  const phone = profile.phone || '(555) 123-4567';
  
  const skills = profile.skills || [];
  const experience = profile.experience || [];
  const education = profile.education || [];
  
  // Extract keywords from job description
  const jobKeywords = extractKeywords(jobDescription);
  
  // Generate HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tailored Resume</title>
      <style>
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          line-height: 1.5;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        h1 {
          margin: 0;
          font-size: 24pt;
          color: #2c3e50;
        }
        .contact-info {
          margin: 10px 0;
          font-size: 11pt;
        }
        h2 {
          font-size: 14pt;
          color: #2c3e50;
          border-bottom: 1px solid #2c3e50;
          margin-top: 15px;
          margin-bottom: 10px;
          padding-bottom: 5px;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .skill {
          background-color: #f8f9fa;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: 10pt;
        }
        .experience-item, .education-item {
          margin-bottom: 15px;
        }
        .job-title, .company, .school, .degree {
          font-weight: bold;
        }
        .job-details, .edu-details {
          display: flex;
          justify-content: space-between;
          font-size: 10pt;
          color: #555;
          margin: 5px 0;
        }
        ul {
          margin: 5px 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 5px;
        }
        .highlight {
          font-weight: bold;
          color: #2980b9;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${name}</h1>
        <div class="contact-info">
          ${email} | ${phone}
        </div>
      </div>
      
      <h2>PROFESSIONAL SUMMARY</h2>
      <p>
        Results-driven ${experience[0]?.title || 'professional'} with ${experience.length} years of experience. 
        Proven track record of delivering high-quality solutions and driving business value through 
        technical excellence.
      </p>
      
      <h2>SKILLS</h2>
      <div class="skills">
        ${skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
      </div>
      
      <h2>EXPERIENCE</h2>
      ${experience.map(exp => `
        <div class="experience-item">
          <div class="job-title">${exp.title}</div>
          <div class="job-details">
            <span class="company">${exp.company}</span>
            <span class="dates">${exp.startDate} - ${exp.endDate}</span>
          </div>
          <ul>
            ${exp.bullets.map(bullet => `<li>${highlightKeywords(bullet, jobKeywords)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      
      <h2>EDUCATION</h2>
      ${education.map(edu => `
        <div class="education-item">
          <div class="school">${edu.school}</div>
          <div class="edu-details">
            <span class="degree">${edu.degree} in ${edu.field}</span>
            <span class="dates">${edu.startDate} - ${edu.endDate}</span>
          </div>
          ${edu.gpa ? `<div>GPA: ${edu.gpa}</div>` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
}

/**
 * Generates cover letter HTML
 */
function generateCoverLetterHtml(profile: any, jobDescription: string): string {
  const name = profile.name || 'Candidate Name';
  const email = profile.email || 'candidate@example.com';
  const phone = profile.phone || '(555) 123-4567';
  
  // Extract job title and company from job description
  const jobTitleMatch = jobDescription.match(/(?:Position|Job Title|Role|Term):\s*([^\n]+)/i);
  const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : 'Professional Position';
  
  const companyMatch = jobDescription.match(/(?:Company|Organization|Employer|At)\s+([A-Z][A-Za-z\s&.,]+)/);
  const company = companyMatch ? companyMatch[1].trim() : 'Your Company';
  
  // Generate HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cover Letter</title>
      <style>
        body {
          font-family: 'Calibri', 'Arial', sans-serif;
          line-height: 1.5;
          color: #333;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
        }
        .header {
          text-align: right;
          margin-bottom: 20px;
        }
        .date {
          margin-bottom: 20px;
        }
        .recipient {
          margin-bottom: 20px;
        }
        .salutation {
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 20px;
        }
        .closing {
          margin-top: 30px;
        }
        .signature {
          margin-top: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>${name}</div>
        <div>${email}</div>
        <div>${phone}</div>
      </div>
      
      <div class="date">
        ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      
      <div class="recipient">
        Hiring Manager<br>
        ${company}<br>
        [Company Address]
      </div>
      
      <div class="salutation">
        Dear Hiring Manager,
      </div>
      
      <div class="content">
        <p>
          I am writing to express my keen interest in the ${jobTitle} position at ${company}. With my background in 
          ${profile.experience?.[0]?.title || 'professional work'} and expertise in 
          ${profile.skills?.slice(0, 3).join(', ') || 'relevant skills'}, I am confident in my ability to make 
          significant contributions to your team.
        </p>
        
        <p>
          In my current role as ${profile.experience?.[0]?.title || 'professional'} at 
          ${profile.experience?.[0]?.company || 'my current company'}, I have 
          ${profile.experience?.[0]?.bullets?.[0]?.toLowerCase() || 'delivered high-quality results'}. 
          This experience has equipped me with the skills necessary to excel in the ${jobTitle} role at ${company}.
        </p>
        
        <p>
          What particularly draws me to ${company} is your commitment to innovation and excellence. I am excited 
          about the opportunity to bring my expertise in 
          ${profile.skills?.slice(0, 3).join(', ') || 'relevant areas'} to your team and contribute to your 
          continued success.
        </p>
        
        <p>
          Thank you for considering my application. I look forward to the opportunity to discuss how my skills and 
          experience align with your needs for the ${jobTitle} position.
        </p>
      </div>
      
      <div class="closing">
        Sincerely,
      </div>
      
      <div class="signature">
        ${name}
      </div>
    </body>
    </html>
  `;
}