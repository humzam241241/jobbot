import { NormalizedResume, ResumeHeader, SkillCategory } from '@/lib/types/resume';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

const SECTION_HEADERS = {
  SUMMARY: /^(?:professional\s+)?summary|profile|objective/i,
  SKILLS: /^(?:technical\s+)?skills|technologies|expertise/i,
  EXPERIENCE: /^(?:professional\s+)?experience|work\s+history/i,
  PROJECTS: /^projects|personal\s+projects/i,
  EDUCATION: /^education|academic/i
};

const SKILL_CATEGORIES = {
  DESIGN: /CAD|Design|Modeling|Simulation/i,
  PROGRAMMING: /Programming|Software|Development/i,
  TOOLS: /Tools|Applications|Software/i,
  CERTIFICATIONS: /Certifications|Licenses/i
};

interface ParsedSection {
  type: string;
  content: string[];
  startIndex: number;
}

export async function parseResumeFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await file.text();
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  throw new Error('Unsupported file type');
}

function extractHeader(text: string): ResumeHeader {
  const lines = text.split('\n').slice(0, 6); // Look at first 6 lines for contact info
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(?:\+\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/;
  const locationRegex = /[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/;
  const urlRegex = /https?:\/\/[^\s]+/g;

  return {
    name: lines[0]?.trim() || '',
    email: lines.find(l => emailRegex.test(l))?.match(emailRegex)?.[0] || '',
    phone: lines.find(l => phoneRegex.test(l))?.match(phoneRegex)?.[0] || '',
    location: lines.find(l => locationRegex.test(l))?.match(locationRegex)?.[0] || '',
    links: lines.map(l => {
      const urls = l.match(urlRegex) || [];
      return urls.map(url => ({
        label: url.includes('linkedin') ? 'LinkedIn' :
               url.includes('github') ? 'GitHub' :
               'Website',
        url
      }));
    }).flat()
  };
}

function findSections(text: string): ParsedSection[] {
  const lines = text.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    // Check if line is a section header
    for (const [type, pattern] of Object.entries(SECTION_HEADERS)) {
      if (pattern.test(trimmedLine)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { type, content: [], startIndex: index };
        return;
      }
    }

    if (currentSection) {
      currentSection.content.push(trimmedLine);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function categorizeSkills(skillsText: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    Design: [],
    Programming: [],
    Tools: [],
    Certifications: []
  };

  let currentCategory = 'Tools'; // Default category

  skillsText.forEach(line => {
    // Check if line is a category header
    for (const [category, pattern] of Object.entries(SKILL_CATEGORIES)) {
      if (pattern.test(line)) {
        currentCategory = category;
        return;
      }
    }

    // Add skills to current category
    const skills = line.split(/[,•]/).map(s => s.trim()).filter(Boolean);
    if (skills.length) {
      categories[currentCategory].push(...skills);
    }
  });

  return categories;
}

function parseExperienceItem(lines: string[]): { role: string; organization: string; startDate: string; endDate: string; bullets: string[] } {
  const firstLine = lines[0];
  const dateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi;
  const dates = firstLine.match(dateRegex) || [];
  
  return {
    role: firstLine.split(/[-|]/).shift()?.trim() || '',
    organization: firstLine.split(/[-|]/).pop()?.replace(dateRegex, '').trim() || '',
    startDate: dates[0] || '',
    endDate: dates[1] || 'Present',
    bullets: lines.slice(1).filter(l => l.trim().startsWith('•')).map(l => l.trim().replace('•', '').trim())
  };
}

export function normalizeResume(text: string): NormalizedResume {
  const sections = findSections(text);
  const header = extractHeader(text);

  const normalized: NormalizedResume = {
    header,
    summary: '',
    skills: {},
    experience: [],
    projects: [],
    education: []
  };

  sections.forEach(section => {
    switch (section.type) {
      case 'SUMMARY':
        normalized.summary = section.content.join(' ').trim();
        break;
      case 'SKILLS':
        normalized.skills = categorizeSkills(section.content);
        break;
      case 'EXPERIENCE':
        // Group content into experience items
        let currentItem: string[] = [];
        section.content.forEach(line => {
          if (line.match(/^\s*•/)) {
            currentItem.push(line);
          } else if (line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)) {
            if (currentItem.length) {
              normalized.experience.push(parseExperienceItem(currentItem));
            }
            currentItem = [line];
          }
        });
        if (currentItem.length) {
          normalized.experience.push(parseExperienceItem(currentItem));
        }
        break;
      case 'PROJECTS':
        // Similar to experience parsing but simpler
        section.content.forEach(line => {
          if (line.includes('|')) {
            const [name, date] = line.split('|').map(s => s.trim());
            normalized.projects.push({
              name,
              date,
              bullets: []
            });
          } else if (line.startsWith('•') && normalized.projects.length) {
            normalized.projects[normalized.projects.length - 1].bullets.push(
              line.replace('•', '').trim()
            );
          }
        });
        break;
      case 'EDUCATION':
        section.content.forEach(line => {
          if (line.includes('|')) {
            const [degree, rest] = line.split('|').map(s => s.trim());
            const [school, dates] = rest.split(',').map(s => s.trim());
            normalized.education.push({
              degree,
              school,
              dates,
              details: []
            });
          } else if (line.startsWith('•') && normalized.education.length) {
            normalized.education[normalized.education.length - 1].details.push(
              line.replace('•', '').trim()
            );
          }
        });
        break;
    }
  });

  return normalized;
}
