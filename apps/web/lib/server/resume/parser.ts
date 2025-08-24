import { debugLogger } from '@/lib/utils/debug-logger';
import type { Profile } from '@/lib/types/profile';

export interface ResumeSection {
  type: 'header' | 'experience' | 'education' | 'skills' | 'projects' | 'other';
  content: string;
  level: number;
}

export async function extractStructure(text: string): Promise<Profile> {
  try {
    debugLogger.info('Extracting resume structure', { textLength: text.length });

    // Basic structure detection
    const sections = detectSections(text);
    
    // Convert to profile
    const profile = convertToProfile(sections);

    debugLogger.info('Structure extraction complete', { 
      sections: sections.length,
      hasProfile: !!profile 
    });

    return profile;

  } catch (error) {
    debugLogger.error('Structure extraction failed', { error });
    throw error;
  }
}

function detectSections(text: string): ResumeSection[] {
  // Split by common section headers
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) continue;

    // Check for section headers
    if (isHeader(trimmed)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        type: getSectionType(trimmed),
        content: trimmed,
        level: getHeaderLevel(trimmed)
      };
    } else if (currentSection) {
      currentSection.content += '\n' + trimmed;
    }
  }

  // Add final section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function isHeader(line: string): boolean {
  // Common section header patterns
  const patterns = [
    /^(EDUCATION|EXPERIENCE|SKILLS|PROJECTS)/i,
    /^[A-Z\s]{5,}$/,
    /^[\w\s]{3,}:$/
  ];
  return patterns.some(p => p.test(line));
}

function getSectionType(header: string): ResumeSection['type'] {
  const lower = header.toLowerCase();
  if (lower.includes('education')) return 'education';
  if (lower.includes('experience')) return 'experience';
  if (lower.includes('skills')) return 'skills';
  if (lower.includes('projects')) return 'projects';
  if (lower.includes('summary') || lower.includes('objective')) return 'header';
  return 'other';
}

function getHeaderLevel(header: string): number {
  if (header.toUpperCase() === header) return 1;
  if (header.endsWith(':')) return 2;
  return 3;
}

function convertToProfile(sections: ResumeSection[]): Profile {
  // Basic profile structure
  const profile: Profile = {
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: []
  };

  for (const section of sections) {
    switch (section.type) {
      case 'header':
        profile.summary = section.content;
        break;
      case 'experience':
        // TODO: Parse experience entries
        break;
      case 'education':
        // TODO: Parse education entries
        break;
      case 'skills':
        profile.skills = section.content
          .split(/[,;]/)
          .map(s => s.trim())
          .filter(Boolean);
        break;
      case 'projects':
        // TODO: Parse project entries
        break;
    }
  }

  return profile;
}
