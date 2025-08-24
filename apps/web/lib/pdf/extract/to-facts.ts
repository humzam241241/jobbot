import { TextBlock } from './extract-pdf';
import { createLogger } from '@/lib/logger';
import _ from 'lodash';

const logger = createLogger('resume-facts');

export interface ResumeFacts {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  skills: string[];
  experience: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string[];
  }>;
  education: Array<{
    degree?: string;
    school?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    details?: string[];
  }>;
}

/**
 * Section types in a resume
 */
enum SectionType {
  CONTACT = 'contact',
  SUMMARY = 'summary',
  SKILLS = 'skills',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  OTHER = 'other',
}

/**
 * Represents a detected section in the resume
 */
interface Section {
  type: SectionType;
  startIndex: number;
  endIndex: number;
  blocks: TextBlock[];
  confidence: number;
}

/**
 * Extracts structured facts from resume text blocks
 */
export function extractResumeFacts(textBlocks: TextBlock[]): ResumeFacts {
  logger.info('Extracting resume facts', { blockCount: textBlocks.length });
  
  // Sort blocks by page and position
  const sortedBlocks = [...textBlocks].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > 10) return a.y - b.y; // Different lines
    return a.x - b.x; // Same line, sort by x
  });
  
  // Detect sections
  const sections = detectSections(sortedBlocks);
  logger.info('Sections detected', { sectionCount: sections.length });
  
  // Extract facts from each section
  const facts: ResumeFacts = {
    contact: {},
    skills: [],
    experience: [],
    education: [],
  };
  
  for (const section of sections) {
    switch (section.type) {
      case SectionType.CONTACT:
        facts.contact = extractContactInfo(section.blocks);
        break;
      case SectionType.SKILLS:
        facts.skills = extractSkills(section.blocks);
        break;
      case SectionType.EXPERIENCE:
        facts.experience = extractExperience(section.blocks);
        break;
      case SectionType.EDUCATION:
        facts.education = extractEducation(section.blocks);
        break;
      case SectionType.SUMMARY:
        // Skip summary as it's not part of the facts structure
        break;
      case SectionType.OTHER:
        // Try to categorize OTHER sections
        if (containsSkillsIndicators(section.blocks)) {
          facts.skills = [...facts.skills, ...extractSkills(section.blocks)];
        }
        break;
    }
  }
  
  // Deduplicate skills
  facts.skills = _.uniq(facts.skills);
  
  logger.info('Resume facts extraction complete', {
    hasContact: Object.keys(facts.contact).length > 0,
    skillsCount: facts.skills.length,
    experienceCount: facts.experience.length,
    educationCount: facts.education.length,
  });
  
  return facts;
}

/**
 * Detects sections in the resume based on font size, position, and keywords
 */
function detectSections(blocks: TextBlock[]): Section[] {
  const sections: Section[] = [];
  let currentType: SectionType | null = null;
  let currentStartIndex = 0;
  let currentBlocks: TextBlock[] = [];
  
  // First block is likely part of the header/contact
  if (blocks.length > 0) {
    currentType = SectionType.CONTACT;
  }
  
  // Find potential section headers
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = block.text.toLowerCase().trim();
    
    // Check if this is a section header
    const sectionType = getSectionType(text, block);
    
    if (sectionType && sectionType !== currentType) {
      // Save previous section if it exists
      if (currentType) {
        sections.push({
          type: currentType,
          startIndex: currentStartIndex,
          endIndex: i - 1,
          blocks: currentBlocks,
          confidence: 0.8, // Default confidence
        });
      }
      
      // Start new section
      currentType = sectionType;
      currentStartIndex = i;
      currentBlocks = [block];
    } else {
      // Continue current section
      currentBlocks.push(block);
    }
  }
  
  // Add the last section
  if (currentType && currentBlocks.length > 0) {
    sections.push({
      type: currentType,
      startIndex: currentStartIndex,
      endIndex: blocks.length - 1,
      blocks: currentBlocks,
      confidence: 0.8,
    });
  }
  
  // If no sections were detected, try to infer them
  if (sections.length === 0) {
    return inferSections(blocks);
  }
  
  return sections;
}

/**
 * Infers sections when explicit section headers are not found
 */
function inferSections(blocks: TextBlock[]): Section[] {
  const sections: Section[] = [];
  
  // First 10% of blocks are likely contact info
  const contactEndIndex = Math.floor(blocks.length * 0.1);
  sections.push({
    type: SectionType.CONTACT,
    startIndex: 0,
    endIndex: contactEndIndex,
    blocks: blocks.slice(0, contactEndIndex + 1),
    confidence: 0.5,
  });
  
  // Look for experience indicators
  let experienceStartIndex = -1;
  let experienceEndIndex = -1;
  
  for (let i = contactEndIndex + 1; i < blocks.length; i++) {
    const text = blocks[i].text.toLowerCase();
    if (experienceStartIndex === -1 && containsDatePattern(text)) {
      experienceStartIndex = i;
    } else if (experienceStartIndex !== -1 && containsEducationIndicator(text)) {
      experienceEndIndex = i - 1;
      break;
    }
  }
  
  if (experienceStartIndex !== -1) {
    experienceEndIndex = experienceEndIndex === -1 ? blocks.length - 1 : experienceEndIndex;
    sections.push({
      type: SectionType.EXPERIENCE,
      startIndex: experienceStartIndex,
      endIndex: experienceEndIndex,
      blocks: blocks.slice(experienceStartIndex, experienceEndIndex + 1),
      confidence: 0.6,
    });
  }
  
  // Look for education indicators
  let educationStartIndex = experienceEndIndex + 1;
  if (educationStartIndex < blocks.length) {
    sections.push({
      type: SectionType.EDUCATION,
      startIndex: educationStartIndex,
      endIndex: blocks.length - 1,
      blocks: blocks.slice(educationStartIndex),
      confidence: 0.6,
    });
  }
  
  // Look for skills (bullet points, comma-separated lists)
  for (let i = contactEndIndex + 1; i < blocks.length; i++) {
    const text = blocks[i].text;
    if (text.includes('•') || text.includes(',') || text.includes('|')) {
      // Find the start of this potential skills section
      let skillsStartIndex = i;
      while (skillsStartIndex > contactEndIndex + 1 && 
             !blocks[skillsStartIndex - 1].text.trim().endsWith(':') &&
             blocks[skillsStartIndex - 1].fontSize <= blocks[skillsStartIndex].fontSize) {
        skillsStartIndex--;
      }
      
      // Find the end of this potential skills section
      let skillsEndIndex = i;
      while (skillsEndIndex < blocks.length - 1 && 
             (blocks[skillsEndIndex + 1].text.includes('•') || 
              blocks[skillsEndIndex + 1].text.includes(',') || 
              blocks[skillsEndIndex + 1].text.includes('|'))) {
        skillsEndIndex++;
      }
      
      sections.push({
        type: SectionType.SKILLS,
        startIndex: skillsStartIndex,
        endIndex: skillsEndIndex,
        blocks: blocks.slice(skillsStartIndex, skillsEndIndex + 1),
        confidence: 0.7,
      });
      
      // Skip ahead
      i = skillsEndIndex;
    }
  }
  
  return sections;
}

/**
 * Determines the section type based on text content and formatting
 */
function getSectionType(text: string, block: TextBlock): SectionType | null {
  // Check for common section headers
  if (containsExperienceIndicator(text)) {
    return SectionType.EXPERIENCE;
  } else if (containsEducationIndicator(text)) {
    return SectionType.EDUCATION;
  } else if (containsSkillsIndicator(text)) {
    return SectionType.SKILLS;
  } else if (containsSummaryIndicator(text)) {
    return SectionType.SUMMARY;
  }
  
  // Check for formatting cues (larger font, bold)
  const isLargerFont = block.fontSize > 12;
  const isBold = block.fontWeight === 'bold';
  
  if (isLargerFont && isBold && text.length < 30) {
    // This might be a section header, but we're not sure which type
    return SectionType.OTHER;
  }
  
  return null;
}

/**
 * Extracts contact information from text blocks
 */
function extractContactInfo(blocks: TextBlock[]): ResumeFacts['contact'] {
  const contact: ResumeFacts['contact'] = {};
  const links: string[] = [];
  
  // The first block with the largest font size is likely the name
  const nameBlock = _.maxBy(blocks.slice(0, 3), 'fontSize');
  if (nameBlock) {
    contact.name = nameBlock.text.trim();
  }
  
  // Look for email, phone, location, and links
  for (const block of blocks) {
    const text = block.text.trim();
    
    // Email
    if (!contact.email && text.includes('@') && text.includes('.')) {
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (emailMatch) {
        contact.email = emailMatch[0];
      }
    }
    
    // Phone
    if (!contact.phone && containsPhonePattern(text)) {
      const phoneMatch = text.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
      if (phoneMatch) {
        contact.phone = phoneMatch[0];
      }
    }
    
    // Location
    if (!contact.location && (text.includes(',') || text.includes(' - '))) {
      // Location often has a comma or dash
      contact.location = text;
    }
    
    // Links
    if (text.includes('linkedin.com') || text.includes('github.com') || text.startsWith('www.') || text.startsWith('http')) {
      links.push(text);
    }
  }
  
  if (links.length > 0) {
    contact.links = links;
  }
  
  return contact;
}

/**
 * Extracts skills from text blocks
 */
function extractSkills(blocks: TextBlock[]): string[] {
  const skills: string[] = [];
  
  for (const block of blocks) {
    const text = block.text.trim();
    
    // Skip likely headers
    if (containsSkillsIndicator(text) && text.length < 30) {
      continue;
    }
    
    // Skills are often in bullet points or comma-separated lists
    if (text.includes('•') || text.includes(',') || text.includes('|')) {
      // Split by common separators
      const parts = text.split(/[•,|]/);
      
      for (const part of parts) {
        const skill = part.trim();
        if (skill && skill.length > 1) {
          skills.push(skill);
        }
      }
    } else if (text.length > 0 && text.length < 50) {
      // Short phrases might be individual skills
      skills.push(text);
    }
  }
  
  return skills;
}

/**
 * Extracts experience items from text blocks
 */
function extractExperience(blocks: TextBlock[]): ResumeFacts['experience'] {
  const experience: ResumeFacts['experience'] = [];
  let currentItem: ResumeFacts['experience'][0] | null = null;
  let currentDescription: string[] = [];
  
  for (const block of blocks) {
    const text = block.text.trim();
    
    // Skip empty blocks and likely section headers
    if (!text || (containsExperienceIndicator(text) && text.length < 30)) {
      continue;
    }
    
    // Check if this is a new experience item
    if (containsDatePattern(text) && (block.fontWeight === 'bold' || block.fontSize > 10)) {
      // Save previous item if it exists
      if (currentItem) {
        if (currentDescription.length > 0) {
          currentItem.description = currentDescription;
        }
        experience.push(currentItem);
      }
      
      // Start new item
      currentItem = {};
      currentDescription = [];
      
      // Extract dates
      const dateMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4}|\w+\s+\d{4})\b/i);
      
      if (dateMatch) {
        currentItem.startDate = dateMatch[1] + ' ' + dateMatch[2];
        currentItem.endDate = dateMatch[3];
        
        // The rest might be title/company
        const beforeDate = text.split(dateMatch[0])[0].trim();
        const afterDate = text.split(dateMatch[0])[1]?.trim();
        
        if (beforeDate) {
          if (beforeDate.includes(',') || beforeDate.includes(' at ') || beforeDate.includes(' - ')) {
            const parts = beforeDate.split(/,| at | - /);
            currentItem.title = parts[0].trim();
            currentItem.company = parts[1]?.trim();
          } else {
            currentItem.title = beforeDate;
          }
        }
        
        if (afterDate) {
          if (!currentItem.company) {
            currentItem.company = afterDate;
          } else if (!currentItem.location) {
            currentItem.location = afterDate;
          }
        }
      } else {
        // No date pattern, might be title/company
        if (text.includes(',') || text.includes(' at ') || text.includes(' - ')) {
          const parts = text.split(/,| at | - /);
          currentItem.title = parts[0].trim();
          currentItem.company = parts[1]?.trim();
          
          // Check if the last part might be a location
          if (parts.length > 2) {
            currentItem.location = parts[parts.length - 1].trim();
          }
        } else {
          currentItem.title = text;
        }
      }
    } else if (currentItem) {
      // This is part of the description for the current item
      if (text.startsWith('•') || text.startsWith('-')) {
        // Bullet point
        currentDescription.push(text.substring(1).trim());
      } else if (currentDescription.length === 0) {
        // First line might be title/company if not extracted yet
        if (!currentItem.title && !currentItem.company) {
          if (text.includes(',') || text.includes(' at ') || text.includes(' - ')) {
            const parts = text.split(/,| at | - /);
            currentItem.title = parts[0].trim();
            currentItem.company = parts[1]?.trim();
          } else {
            currentItem.title = text;
          }
        } else {
          currentDescription.push(text);
        }
      } else {
        // Additional description
        currentDescription.push(text);
      }
    }
  }
  
  // Add the last item
  if (currentItem) {
    if (currentDescription.length > 0) {
      currentItem.description = currentDescription;
    }
    experience.push(currentItem);
  }
  
  return experience;
}

/**
 * Extracts education items from text blocks
 */
function extractEducation(blocks: TextBlock[]): ResumeFacts['education'] {
  const education: ResumeFacts['education'] = [];
  let currentItem: ResumeFacts['education'][0] | null = null;
  let currentDetails: string[] = [];
  
  for (const block of blocks) {
    const text = block.text.trim();
    
    // Skip empty blocks and likely section headers
    if (!text || (containsEducationIndicator(text) && text.length < 30)) {
      continue;
    }
    
    // Check if this is a new education item
    if ((containsSchoolIndicator(text) || containsDegreeIndicator(text)) && 
        (block.fontWeight === 'bold' || block.fontSize > 10)) {
      // Save previous item if it exists
      if (currentItem) {
        if (currentDetails.length > 0) {
          currentItem.details = currentDetails;
        }
        education.push(currentItem);
      }
      
      // Start new item
      currentItem = {};
      currentDetails = [];
      
      // Extract school and degree
      if (text.includes(',') || text.includes(' - ')) {
        const parts = text.split(/,| - /);
        
        // Determine which part is school and which is degree
        for (const part of parts) {
          const trimmedPart = part.trim();
          if (containsDegreeIndicator(trimmedPart) && !currentItem.degree) {
            currentItem.degree = trimmedPart;
          } else if (!currentItem.school) {
            currentItem.school = trimmedPart;
          } else if (!currentItem.location) {
            currentItem.location = trimmedPart;
          }
        }
      } else {
        // Single part, likely school
        currentItem.school = text;
      }
      
      // Extract dates
      const dateMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4}|\w+\s+\d{4})\b/i);
      
      if (dateMatch) {
        currentItem.startDate = dateMatch[1] + ' ' + dateMatch[2];
        currentItem.endDate = dateMatch[3];
      }
    } else if (currentItem) {
      // This is part of the details for the current item
      
      // Check for GPA
      if (text.includes('GPA') || text.includes('Grade Point Average')) {
        const gpaMatch = text.match(/\b[0-9](\.[0-9])?\/[0-9](\.[0-9])?\b/);
        if (gpaMatch) {
          currentItem.gpa = gpaMatch[0];
        }
      }
      
      // Check for dates if not found yet
      if (!currentItem.startDate && !currentItem.endDate) {
        const dateMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4}|\w+\s+\d{4})\b/i);
        
        if (dateMatch) {
          currentItem.startDate = dateMatch[1] + ' ' + dateMatch[2];
          currentItem.endDate = dateMatch[3];
        }
      }
      
      // Check for degree if not found yet
      if (!currentItem.degree && containsDegreeIndicator(text)) {
        currentItem.degree = text;
      } else {
        // Additional details
        currentDetails.push(text);
      }
    }
  }
  
  // Add the last item
  if (currentItem) {
    if (currentDetails.length > 0) {
      currentItem.details = currentDetails;
    }
    education.push(currentItem);
  }
  
  return education;
}

// Helper functions for pattern matching

function containsExperienceIndicator(text: string): boolean {
  const patterns = [
    /\bexperience\b/i,
    /\bwork\s+history\b/i,
    /\bemployment\b/i,
    /\bcareer\b/i,
    /\bprofessional\s+experience\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsEducationIndicator(text: string): boolean {
  const patterns = [
    /\beducation\b/i,
    /\bacademic\b/i,
    /\bdegree\b/i,
    /\bqualification\b/i,
    /\bschool\b/i,
    /\bcollege\b/i,
    /\buniversity\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsSkillsIndicator(text: string): boolean {
  const patterns = [
    /\bskills\b/i,
    /\bcompetencies\b/i,
    /\bproficiencies\b/i,
    /\bcapabilities\b/i,
    /\btechnical\s+skills\b/i,
    /\bcore\s+competencies\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsSummaryIndicator(text: string): boolean {
  const patterns = [
    /\bsummary\b/i,
    /\bprofile\b/i,
    /\bobjective\b/i,
    /\babout\s+me\b/i,
    /\bprofessional\s+summary\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsSchoolIndicator(text: string): boolean {
  const patterns = [
    /\buniversity\b/i,
    /\bcollege\b/i,
    /\bschool\b/i,
    /\binstitute\b/i,
    /\bacademy\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsDegreeIndicator(text: string): boolean {
  const patterns = [
    /\bb\.?a\.?\b/i, // Bachelor of Arts
    /\bb\.?s\.?\b/i, // Bachelor of Science
    /\bm\.?a\.?\b/i, // Master of Arts
    /\bm\.?s\.?\b/i, // Master of Science
    /\bph\.?d\.?\b/i, // Doctor of Philosophy
    /\bm\.?b\.?a\.?\b/i, // Master of Business Administration
    /\bbachelor\b/i,
    /\bmaster\b/i,
    /\bdoctor\b/i,
    /\bdegree\b/i,
    /\bdiploma\b/i,
    /\bcertificate\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsDatePattern(text: string): boolean {
  const patterns = [
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i,
    /\b\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4})\b/i,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4}|\w+\s+\d{4})\b/i,
  ];
  return patterns.some(pattern => pattern.test(text));
}

function containsPhonePattern(text: string): boolean {
  const patterns = [
    /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
    /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  ];
  return patterns.some(pattern => pattern.test(text));
}
