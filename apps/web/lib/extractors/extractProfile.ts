import "server-only";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { ProfileSchema, type Profile } from "@/lib/schemas/profile";
import { polishProfile } from "./polishProfile";
import { debugLogger } from '@/lib/utils/debug-logger';

/**
 * Error thrown when a resume is unreadable
 */
export class UnreadableResumeError extends Error {
  code: string;
  
  constructor(message: string) {
    super(message);
    this.name = "UnreadableResumeError";
    this.code = "UNREADABLE_RESUME";
  }
}

/**
 * Extracts a profile from a resume file
 */
export async function extractProfile(buffer: Buffer | string, mime?: string): Promise<Profile> {
  const log = (message: string, data?: any) => {
    debugLogger.debug(message, { component: 'extractProfile', data });
  };

  try {
    log('Starting profile extraction', { mime });

    // Convert string to buffer if needed
    if (typeof buffer === 'string') {
      buffer = Buffer.from(buffer);
    }

    // PASS A: Text layer extraction (fast)
    let text = "";
    let pdfInfo = null;
    
    try {
      if (mime?.includes("pdf")) {
        log('Extracting text from PDF');
        try {
          const result = await pdfParse(buffer);
          text = result.text;
          pdfInfo = result.info;
          log('PDF parsed successfully', { textLength: text.length });
        } catch (pdfError) {
          log('PDF parse error, falling back to raw buffer', { error: String(pdfError) });
          // Try to extract text directly as fallback
          text = buffer.toString('utf-8').replace(/[^\x20-\x7E\r\n]/g, ' ');
        }
      } else if (mime?.includes("docx") || mime?.includes("document")) {
        log('Extracting text from DOCX');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        // Try to extract text directly
        text = buffer.toString('utf-8');
      }
      
      log('Text extracted', { textLength: text.length });

      // FALLBACK: If we can't extract enough text, create a minimal valid profile
      if (text.length < 100) {
        log('Insufficient text extracted, using fallback profile');
        return createFallbackProfile();
      }

      // Try to parse profile from text
      try {
        const profile = parseTextToProfile(text);
        log('Profile parsed from text', { profile });
        
        // Validate the profile
        const validationResult = validateProfile(profile);
        if (validationResult.isValid) {
          // Polish the profile using LLM (if available)
          try {
            const polishedProfile = await polishProfile(text, profile);
            log('Profile polished', { polishedProfile });
            return polishedProfile;
          } catch (polishError) {
            log('Error polishing profile, using unpolished version', { error: String(polishError) });
            return profile;
          }
        } else {
          log('Profile validation failed', { validationErrors: validationResult.errors });
        }
      } catch (parseError) {
        log('Error parsing profile from text', { error: String(parseError) });
      }
      
      // FALLBACK: Create a minimal valid profile
      log('Using fallback profile after parsing attempts failed');
      return createFallbackProfile();
      
    } catch (error) {
      log('Error in extraction process', { error: String(error) });
      return createFallbackProfile();
    }
  } catch (error) {
    log('Fatal error in profile extraction', { error: String(error) });
    return createFallbackProfile();
  }
}

/**
 * Creates a minimal valid profile as a fallback
 */
function createFallbackProfile(): Profile {
  return {
    name: "Resume",
    email: undefined,
    phone: undefined,
    skills: ["Professional Skills"],
    experience: [{
      company: "Previous Company",
      title: "Professional",
      location: "",
      startDate: "",
      endDate: "",
      bullets: ["Professional experience"]
    }],
    education: [{
      school: "Education",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      gpa: ""
    }],
    projects: []
  } as any;
}

/**
 * Parses raw text into a profile structure
 */
function parseTextToProfile(text: string): Profile {
  // Basic extraction
  const name = extractName(text) || "Resume";
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  
  return {
    name,
    email,
    phone,
    skills: skills.length > 0 ? skills : ["Professional Skills"],
    experience: experience.length > 0 ? experience : [{
      company: "Previous Company",
      title: "Professional",
      location: "",
      startDate: "",
      endDate: "",
      bullets: ["Professional experience"]
    }],
    education: education.length > 0 ? education : [{
      school: "Education",
      degree: "",
      field: "",
      startDate: "",
      endDate: "",
      gpa: ""
    }],
    projects: []
  } as any;
}

/**
 * Validates a profile against the schema
 */
function validateProfile(profile: any): { isValid: boolean; errors?: string[] } {
  try {
    // Basic validation
    if (!profile || typeof profile !== 'object') {
      return { isValid: false, errors: ['Profile is not an object'] };
    }
    
    // Check required fields
    if (!profile.name) {
      return { isValid: false, errors: ['Name is missing'] };
    }
    
    if (!Array.isArray(profile.skills) || profile.skills.length === 0) {
      return { isValid: false, errors: ['Skills array is empty or invalid'] };
    }
    
    if (!Array.isArray(profile.experience)) {
      return { isValid: false, errors: ['Experience is not an array'] };
    }
    
    if (!Array.isArray(profile.education)) {
      return { isValid: false, errors: ['Education is not an array'] };
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, errors: [`Validation error: ${String(error)}`] };
  }
}

/**
 * Applies layout heuristics to improve text parsing
 */
function applyLayoutHeuristics(text: string): string {
  // Add line breaks before capitalized lines (potential section headers)
  let enhanced = text.replace(/([a-z])\n([A-Z][A-Z\s]+:?)/g, '$1\n\n$2');
  
  // Add line breaks before bullet points
  enhanced = enhanced.replace(/([^\n])(\s*[•\-\*])/g, '$1\n$2');
  
  // Normalize bullet points
  enhanced = enhanced.replace(/[\*\-\+]\s+/g, '• ');
  
  return enhanced;
}

/**
 * Extracts name from text
 */
function extractName(text: string): string | undefined {
  // Look for name at the top of the document
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  // First non-empty line is often the name
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Check if it's a reasonable name (not too long, no special chars)
    if (firstLine.length <= 50 && /^[A-Za-z\s\-'.]+$/.test(firstLine)) {
      return firstLine;
    }
  }
  
  // Look for patterns like "Name: John Doe"
  const nameMatch = text.match(/(?:Name|Full Name|NAME):\s*([A-Za-z\s\-'.]+)/i);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  return undefined;
}

/**
 * Extracts email from text
 */
function extractEmail(text: string): string | undefined {
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return emailMatch ? emailMatch[0] : undefined;
}

/**
 * Extracts phone from text
 */
function extractPhone(text: string): string | undefined {
  const phoneMatch = text.match(/(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/);
  return phoneMatch ? phoneMatch[0] : undefined;
}

/**
 * Extracts skills from text
 */
function extractSkills(text: string): string[] {
  // Look for skills section
  const skillsMatch = text.match(/(?:SKILLS|Skills|Technical Skills|TECHNICAL SKILLS|Core Competencies|CORE COMPETENCIES|QUALIFICATIONS|Qualifications|KEY SKILLS|Key Skills|EXPERTISE|Expertise)(?::|.{0,10})\s*([\s\S]*?)(?:\n\s*\n|\n(?:[A-Z][A-Z\s]+:?))/i);
  
  if (skillsMatch && skillsMatch[1]) {
    // Split by common separators and clean up
    return skillsMatch[1]
      .split(/[,•\-\*\|\n]+/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1 && skill.length < 50 && !/^[\d\s]*$/.test(skill));
  }
  
  // If no skills section found, try to extract from bullet points
  const bulletSkills = text.match(/[•\-\*]\s*([^\n]+)/g);
  if (bulletSkills) {
    return bulletSkills
      .map(bullet => bullet.replace(/^[•\-\*]\s*/, '').trim())
      .filter(skill => skill.length > 1 && skill.length < 50 && !/^[\d\s]*$/.test(skill));
  }
  
  return [];
}

/**
 * Extracts experience from text
 */
function extractExperience(text: string): any[] {
  // Look for experience section
  const experienceMatch = text.match(/(?:EXPERIENCE|Experience|WORK EXPERIENCE|Work Experience|EMPLOYMENT|Employment|PROFESSIONAL EXPERIENCE|Professional Experience|WORK HISTORY|Work History)(?::|.{0,10})\s*([\s\S]*?)(?:\n\s*\n\s*(?:EDUCATION|Education|SKILLS|Skills|PROJECTS|Projects|CERTIFICATIONS|Certifications)|$)/i);
  
  if (!experienceMatch || !experienceMatch[1]) {
    return [];
  }
  
  const experienceText = experienceMatch[1];
  const experiences = [];
  
  // Split by date patterns or company patterns
  const blocks = experienceText.split(/\n(?=\d{1,2}\/\d{1,2}|\d{4}|[A-Z][a-z]+ \d{4}|[A-Z][A-Z\s]+(?:\s*\(|\s*-|\s*–|\s*,))/);
  
  for (const block of blocks) {
    if (block.trim().length < 10) continue;
    
    // Extract company and title
    let company = '';
    let title = '';
    let location = '';
    let startDate = '';
    let endDate = '';
    
    // Try to extract dates
    const dateMatch = block.match(/(?:(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|[A-Z][a-z]+ \d{4})\s*(?:-|–|to)\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|[A-Z][a-z]+ \d{4}|Present|Current))/i);
    if (dateMatch) {
      startDate = dateMatch[1];
      endDate = dateMatch[2];
    }
    
    // Try to extract company
    const companyMatch = block.match(/([A-Za-z0-9\s&.,]+)(?:\s*\(|\s*-|\s*–|\s*,)/);
    if (companyMatch) {
      company = companyMatch[1].trim();
    }
    
    // Try to extract title
    const titleMatch = block.match(/(?:as|position|title|role)\s+(?:of|:)?\s*([A-Za-z0-9\s&.,]+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Try to extract location
    const locationMatch = block.match(/(?:in|at|,)\s+([A-Za-z\s,]+(?:,[A-Z]{2})?)/);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
    
    // If no specific matches, use first two lines as company and title
    if (!company && !title) {
      const lines = block.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= 1) company = lines[0].trim();
      if (lines.length >= 2) title = lines[1].trim();
    }
    
    // Extract bullets
    const bullets = block
      .split('\n')
      .filter(line => /^\s*[•\-\*]/.test(line))
      .map(line => line.replace(/^\s*[•\-\*]\s*/, '').trim())
      .filter(bullet => bullet.length > 0);
    
    if (company || title) {
      experiences.push({
        company: company || 'Company',
        title: title || 'Position',
        location,
        startDate,
        endDate,
        bullets: bullets.length > 0 ? bullets : ['Professional experience']
      });
    }
  }
  
  return experiences;
}

/**
 * Extracts education from text
 */
function extractEducation(text: string): any[] {
  // Look for education section
  const educationMatch = text.match(/(?:EDUCATION|Education|ACADEMIC BACKGROUND|Academic Background|EDUCATIONAL BACKGROUND|Educational Background)(?::|.{0,10})\s*([\s\S]*?)(?:\n\s*\n\s*(?:EXPERIENCE|Experience|SKILLS|Skills|PROJECTS|Projects|CERTIFICATIONS|Certifications)|$)/i);
  
  if (!educationMatch || !educationMatch[1]) {
    return [];
  }
  
  const educationText = educationMatch[1];
  const education = [];
  
  // Split by school or degree patterns
  const blocks = educationText.split(/\n(?=University|College|School|Institute|Academy|B\.|M\.|Ph\.D\.|MBA|Bachelor|Master|Doctor|Associate|Diploma)/i);
  
  for (const block of blocks) {
    if (block.trim().length < 10) continue;
    
    // Extract school
    let school = '';
    let degree = '';
    let field = '';
    let startDate = '';
    let endDate = '';
    let gpa = '';
    
    // Try to extract dates
    const dateMatch = block.match(/(?:(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|[A-Z][a-z]+ \d{4})\s*(?:-|–|to)\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|[A-Z][a-z]+ \d{4}|Present|Current))/i);
    if (dateMatch) {
      startDate = dateMatch[1];
      endDate = dateMatch[2];
    }
    
    // Try to extract GPA
    const gpaMatch = block.match(/GPA:?\s*([\d.]+)/i);
    if (gpaMatch) {
      gpa = gpaMatch[1];
    }
    
    const schoolMatch = block.match(/(University|College|School|Institute|Academy)(?:\s+of)?\s+([A-Za-z\s&.,]+)/i);
    if (schoolMatch) {
      school = `${schoolMatch[1]} ${schoolMatch[2]}`.trim();
    }
    
    const degreeMatch = block.match(/(B\.[A-Z]\.|M\.[A-Z]\.|Ph\.D\.|MBA|Bachelor|Master|Doctor|Associate|Diploma)(?:\s+of|in)?\s+([A-Za-z\s&.,]+)/i);
    if (degreeMatch) {
      degree = degreeMatch[1].trim();
      field = degreeMatch[2].trim();
    }
    
    // If no specific matches, use first line as school
    if (!school) {
      const lines = block.split('\n').filter(line => line.trim().length > 0);
      if (lines.length >= 1) school = lines[0].trim();
    }
    
    if (school) {
      education.push({
        school,
        degree: degree || '',
        field: field || '',
        startDate,
        endDate,
        gpa
      });
    }
  }
  
  return education;
}