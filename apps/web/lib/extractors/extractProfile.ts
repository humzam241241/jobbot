import "server-only";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import { ProfileSchema, type Profile } from "@/lib/schemas/profile";
import { polishProfile } from "./polishProfile";

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
 * Extracts a profile from a file buffer
 * @param buffer The file buffer
 * @param mime The file MIME type
 * @returns A Profile object
 */
export async function extractProfile(buffer: Buffer, mime: string): Promise<Profile> {
  // PASS A: Text layer extraction (fast)
  let text = "";
  let pdfInfo = null;
  
  try {
    if (mime.includes("pdf")) {
      const result = await pdfParse(buffer);
      text = result.text;
      pdfInfo = result.info;
    } else if (mime.includes("docx") || mime.includes("document")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      throw new UnreadableResumeError("Unsupported file format. Please upload a PDF or DOCX file.");
    }
    
    // Check if we have enough text to parse
    if (text.length >= 500) {
      try {
        const profile = parseTextToProfile(text);
        
        // Validate the profile
        const validationResult = validateProfile(profile);
        if (validationResult.isValid) {
          // Polish the profile using LLM (if available)
          return await polishProfile(text, profile);
        }
      } catch (error) {
        console.error("Error in PASS A:", error);
        // Continue to PASS B
      }
    }
    
    // PASS B: Layout hinting
    if (text.length > 0) {
      try {
        // Apply layout heuristics
        const enhancedText = applyLayoutHeuristics(text);
        const profile = parseTextToProfile(enhancedText);
        
        // Validate the profile
        const validationResult = validateProfile(profile);
        if (validationResult.isValid) {
          // Polish the profile using LLM (if available)
          return await polishProfile(text, profile);
        }
      } catch (error) {
        console.error("Error in PASS B:", error);
        // Continue to PASS C
      }
    }
    
    // PASS C: OCR fallback (only for PDFs)
    if (mime.includes("pdf") && (text.length < 200 || (pdfInfo && !pdfInfo.IsTextExtractable))) {
      try {
        const ocrText = await performOcr(buffer);
        if (ocrText.length > 0) {
          const profile = parseTextToProfile(ocrText);
          
          // Validate the profile
          const validationResult = validateProfile(profile);
          if (validationResult.isValid) {
            // Polish the profile using LLM (if available)
            return await polishProfile(ocrText, profile);
          }
        }
      } catch (error) {
        console.error("Error in PASS C:", error);
        // Fall through to error handling
      }
    }
    
    // If we got here, all passes failed
    throw new UnreadableResumeError("Could not extract a valid profile from the document.");
  } catch (error) {
    if (error instanceof UnreadableResumeError) {
      throw error;
    }
    
    console.error("Error extracting profile:", error);
    throw new UnreadableResumeError("Failed to process the document. Please try a different file format.");
  }
}

/**
 * Parses text into a Profile object
 * @param text The text to parse
 * @returns A partial Profile object
 */
export function parseTextToProfile(text: string): Partial<Profile> {
  // Split the text into lines and clean them
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Extract basic information
  const name = extractName(lines);
  const email = extractEmail(text);
  const phone = extractPhone(text);
  const website = extractWebsite(text);
  const location = extractLocation(text);
  const summary = extractSummary(lines);
  const skills = extractSkills(lines, text);
  const experience = extractExperience(lines);
  const education = extractEducation(lines);
  
  return {
    name,
    email,
    phone,
    website,
    location,
    summary,
    skills,
    experience,
    education,
  };
}

/**
 * Validates a profile
 * @param profile The profile to validate
 * @returns Validation result
 */
function validateProfile(profile: Partial<Profile>): { isValid: boolean; message?: string } {
  // Parse with Zod schema
  const result = ProfileSchema.safeParse(profile);
  
  if (!result.success) {
    return { isValid: false, message: result.error.message };
  }
  
  // Additional validation: must have name and either email or phone
  if (!result.data.name || result.data.name === "Unknown") {
    return { isValid: false, message: "Could not extract name from document" };
  }
  
  // We'll consider the profile valid even if email and phone are missing
  // as long as we have a name
  
  return { isValid: true };
}

/**
 * Applies layout heuristics to improve text parsing
 * @param text The text to enhance
 * @returns Enhanced text
 */
function applyLayoutHeuristics(text: string): string {
  // Split by lines
  let lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Detect and mark sections
  const enhancedLines = lines.map((line, index) => {
    // Check for section headers
    if (/^(SUMMARY|PROFILE|OBJECTIVE|EXPERIENCE|EMPLOYMENT|WORK|EDUCATION|SKILLS|CERTIFICATIONS)/i.test(line)) {
      return `\n### ${line.toUpperCase()} ###\n`;
    }
    
    // Check for potential job titles or companies (capitalized words followed by dates)
    if (/^[A-Z][a-zA-Z\s]+\s+\d{4}/i.test(line)) {
      return `\n## ${line} ##`;
    }
    
    // Check for bullet points
    if (/^[•\-\*\+]/i.test(line)) {
      return `• ${line.replace(/^[•\-\*\+]\s*/, "")}`;
    }
    
    return line;
  });
  
  // Join lines back together
  return enhancedLines.join("\n");
}

/**
 * Performs OCR on a PDF buffer
 * @param buffer The PDF buffer
 * @returns Extracted text
 */
async function performOcr(buffer: Buffer): Promise<string> {
  try {
    // Create a worker
    const worker = await createWorker();
    
    // Initialize worker with English language
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    
    // Recognize text from the PDF buffer
    const { data } = await worker.recognize(buffer);
    
    // Terminate the worker
    await worker.terminate();
    
    return data.text;
  } catch (error) {
    console.error("OCR error:", error);
    throw new Error("OCR processing failed");
  }
}

/**
 * Extracts name from the first few lines
 * @param lines Array of text lines
 * @returns Extracted name or "Unknown"
 */
function extractName(lines: string[]): string {
  // Look at the first 6 non-empty lines
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const line = lines[i];
    
    // Skip lines that look like contact info
    if (
      /^(email|phone|tel|e-mail|mobile|cell|website|www|http)/i.test(line) ||
      /[@\(\)\d\-\+]/.test(line) || // Contains @ or phone number characters
      line.length > 40 || // Too long to be a name
      line.split(/\s+/).length > 6 // Too many words to be a name
    ) {
      continue;
    }
    
    // This might be a name
    return line;
  }
  
  return "Unknown";
}

/**
 * Extracts email from text
 * @param text Full text content
 * @returns Extracted email or undefined
 */
function extractEmail(text: string): string | undefined {
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const matches = text.match(emailRegex);
  
  return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Extracts phone number from text
 * @param text Full text content
 * @returns Extracted phone or undefined
 */
function extractPhone(text: string): string | undefined {
  // Various phone formats
  const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = text.match(phoneRegex);
  
  return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Extracts website URL from text
 * @param text Full text content
 * @returns Extracted website or undefined
 */
function extractWebsite(text: string): string | undefined {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  const matches = text.match(urlRegex);
  
  return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Extracts location from text
 * @param text Full text content
 * @returns Extracted location or undefined
 */
function extractLocation(text: string): string | undefined {
  // Look for common location patterns
  const locationRegex = /([A-Za-z\s]+,\s*[A-Z]{2})|(Remote)/i;
  const matches = text.match(locationRegex);
  
  return matches && matches.length > 0 ? matches[0] : undefined;
}

/**
 * Extracts summary from lines
 * @param lines Array of text lines
 * @returns Extracted summary or undefined
 */
function extractSummary(lines: string[]): string | undefined {
  // Find the summary section
  const summaryIndex = lines.findIndex(line => 
    /^(SUMMARY|PROFILE|OBJECTIVE|ABOUT)/i.test(line)
  );
  
  if (summaryIndex !== -1) {
    // Extract up to 3 lines after the summary header
    const summaryLines = [];
    for (let i = summaryIndex + 1; i < Math.min(summaryIndex + 4, lines.length); i++) {
      // Stop if we hit another section header
      if (/^(EXPERIENCE|EMPLOYMENT|WORK|EDUCATION|SKILLS|CERTIFICATIONS)/i.test(lines[i])) {
        break;
      }
      summaryLines.push(lines[i]);
    }
    
    return summaryLines.join(" ");
  }
  
  return undefined;
}

/**
 * Extracts skills from text
 * @param lines Array of text lines
 * @param fullText Full text content
 * @returns Array of skills
 */
function extractSkills(lines: string[], fullText: string): string[] {
  // Find the skills section
  const skillsIndex = lines.findIndex(line => 
    /^(SKILLS|TECHNOLOGIES|TECHNICAL SKILLS)/i.test(line)
  );
  
  let skills: string[] = [];
  
  if (skillsIndex !== -1) {
    // Extract skills from the next few lines
    let i = skillsIndex + 1;
    while (i < lines.length && i < skillsIndex + 10) {
      // Stop if we hit another section header
      if (/^(EXPERIENCE|EMPLOYMENT|WORK|EDUCATION|CERTIFICATIONS)/i.test(lines[i])) {
        break;
      }
      
      // Split by common delimiters
      const lineSkills = lines[i]
        .split(/[,|•\-\*\+;]/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0 && skill.length < 30);
      
      skills = [...skills, ...lineSkills];
      i++;
    }
  }
  
  // If no skills section found, try to extract from full text
  if (skills.length === 0) {
    // Common technical skills
    const techSkills = [
      "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Ruby", "Go", "PHP",
      "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "SQL", "NoSQL", "MongoDB"
    ];
    
    // Check for each skill in the text
    skills = techSkills.filter(skill => 
      new RegExp(`\\b${skill}\\b`, "i").test(fullText)
    );
  }
  
  // Deduplicate and limit to 30 skills
  return [...new Set(skills)].slice(0, 30);
}

/**
 * Extracts experience from lines
 * @param lines Array of text lines
 * @returns Array of experience items
 */
function extractExperience(lines: string[]): Array<{
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
}> {
  const experience = [];
  
  // Find the experience section
  const experienceIndex = lines.findIndex(line => 
    /^(EXPERIENCE|EMPLOYMENT|WORK|PROFESSIONAL EXPERIENCE)/i.test(line)
  );
  
  if (experienceIndex !== -1) {
    let i = experienceIndex + 1;
    let currentExp = null;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Stop if we hit another major section
      if (/^(EDUCATION|SKILLS|CERTIFICATIONS|PROJECTS)/i.test(line)) {
        break;
      }
      
      // Check for job title and company patterns
      // Common formats: "Job Title | Company | Dates" or "Company - Job Title - Dates"
      if (line.includes("|") || /^[A-Z]/.test(line) && (line.includes(" - ") || /\d{4}/.test(line))) {
        // Save the previous experience if it exists
        if (currentExp && currentExp.title && currentExp.company) {
          experience.push(currentExp);
        }
        
        // Parse the new experience entry
        let title = "", company = "", dates = "", location = "";
        
        if (line.includes("|")) {
          const parts = line.split("|").map(p => p.trim());
          title = parts[0];
          company = parts[1] || "";
          
          if (parts.length > 2) {
            // Check if the third part is dates or location
            if (/\d{4}/.test(parts[2])) {
              dates = parts[2];
            } else {
              location = parts[2];
            }
          }
          
          if (parts.length > 3) {
            dates = parts[3];
          }
        } else if (line.includes(" - ")) {
          const parts = line.split(" - ").map(p => p.trim());
          company = parts[0];
          title = parts[1] || "";
          
          if (parts.length > 2) {
            // Check if the third part is dates or location
            if (/\d{4}/.test(parts[2])) {
              dates = parts[2];
            } else {
              location = parts[2];
            }
          }
        } else {
          // Try to extract title and company from a single line
          const dateMatch = line.match(/\d{4}/);
          if (dateMatch) {
            const dateIndex = line.indexOf(dateMatch[0]);
            const beforeDate = line.substring(0, dateIndex).trim();
            
            // Try to split the before date part into title and company
            const titleCompanyParts = beforeDate.split(/\s+at\s+|\s+@\s+|\s*[-–—]\s*/);
            if (titleCompanyParts.length > 1) {
              title = titleCompanyParts[0];
              company = titleCompanyParts[1];
            } else {
              title = beforeDate;
            }
            
            dates = line.substring(dateIndex);
          } else {
            title = line;
          }
        }
        
        // Extract start and end dates
        let startDate, endDate;
        if (dates) {
          const dateMatch = dates.match(/(\d{4})(?:\s*[-–—]\s*(\d{4}|Present|Current|Now))?/i);
          if (dateMatch) {
            startDate = dateMatch[1];
            endDate = dateMatch[2] || "Present";
          }
        }
        
        currentExp = {
          title,
          company,
          location,
          startDate,
          endDate,
          bullets: []
        };
      } 
      // Check for bullet points
      else if (/^[•\-\*\+]/.test(line) || /^\s+[•\-\*\+]/.test(line)) {
        if (currentExp) {
          const bullet = line.replace(/^[•\-\*\+\s]+/, "").trim();
          if (bullet && currentExp.bullets.length < 8) {
            currentExp.bullets.push(bullet);
          }
        }
      } 
      // Check for indented lines that might be bullet points without markers
      else if (/^\s{2,}/.test(line) && currentExp) {
        const text = line.trim();
        if (text && currentExp.bullets.length < 8) {
          currentExp.bullets.push(text);
        }
      }
      
      i++;
    }
    
    // Add the last experience if it exists
    if (currentExp && currentExp.title && currentExp.company) {
      experience.push(currentExp);
    }
  }
  
  // Limit to 6 experiences
  return experience.slice(0, 6);
}

/**
 * Extracts education from lines
 * @param lines Array of text lines
 * @returns Array of education items
 */
function extractEducation(lines: string[]): Array<{
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}> {
  const education = [];
  
  // Find the education section
  const educationIndex = lines.findIndex(line => 
    /^(EDUCATION|ACADEMIC|DEGREE)/i.test(line)
  );
  
  if (educationIndex !== -1) {
    let i = educationIndex + 1;
    let currentEdu = null;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Stop if we hit another major section
      if (/^(EXPERIENCE|EMPLOYMENT|WORK|SKILLS|CERTIFICATIONS|PROJECTS)/i.test(line)) {
        break;
      }
      
      // Check for school and degree patterns
      if (/^[A-Z]/.test(line) && (
        /university|college|school|institute/i.test(line) || 
        /bachelor|master|phd|degree|diploma/i.test(line) ||
        /\d{4}/.test(line)
      )) {
        // Save the previous education if it exists
        if (currentEdu && currentEdu.school) {
          education.push(currentEdu);
        }
        
        // Parse the new education entry
        let school = "", degree = "", field = "", dates = "";
        
        // Check for common formats
        if (line.includes("|")) {
          const parts = line.split("|").map(p => p.trim());
          school = parts[0];
          degree = parts[1] || "";
          
          if (parts.length > 2) {
            // Check if third part is dates or field
            if (/\d{4}/.test(parts[2])) {
              dates = parts[2];
            } else {
              field = parts[2];
            }
          }
          
          if (parts.length > 3) {
            dates = parts[3];
          }
        } else if (line.includes(" - ")) {
          const parts = line.split(" - ").map(p => p.trim());
          school = parts[0];
          degree = parts[1] || "";
          
          if (parts.length > 2) {
            // Check if third part is dates or field
            if (/\d{4}/.test(parts[2])) {
              dates = parts[2];
            } else {
              field = parts[2];
            }
          }
        } else {
          // Try to extract degree and school from a single line
          const degreeMatch = line.match(/bachelor|master|phd|bs|ba|ms|ma|mba|doctorate/i);
          if (degreeMatch) {
            const degreeIndex = line.toLowerCase().indexOf(degreeMatch[0]);
            degree = line.substring(degreeIndex).split(",")[0].trim();
            school = line.substring(0, degreeIndex).trim();
            
            // If school is empty, the entire line might be the school
            if (!school) {
              school = line;
              degree = "";
            }
          } else {
            school = line;
          }
          
          // Extract dates if present
          const dateMatch = line.match(/\d{4}/);
          if (dateMatch) {
            dates = dateMatch[0];
          }
        }
        
        // Extract start and end dates
        let startDate, endDate;
        if (dates) {
          const dateMatch = dates.match(/(\d{4})(?:\s*[-–—]\s*(\d{4}|Present|Current|Now))?/i);
          if (dateMatch) {
            startDate = dateMatch[1];
            endDate = dateMatch[2] || "Present";
          }
        }
        
        // Extract GPA if present
        let gpa;
        const gpaMatch = line.match(/GPA\s*[:=]?\s*([\d.]+)/i) || line.match(/(\d\.\d+)\s*GPA/i);
        if (gpaMatch) {
          gpa = gpaMatch[1];
        }
        
        currentEdu = {
          school,
          degree,
          field,
          startDate,
          endDate,
          gpa
        };
      } 
      // Check for additional education details
      else if (currentEdu && !line.startsWith("•") && !line.startsWith("-")) {
        // Check for degree information
        if (/bachelor|master|phd|bs|ba|ms|ma|mba|doctorate/i.test(line) && !currentEdu.degree) {
          currentEdu.degree = line.trim();
        } 
        // Check for field of study
        else if (/major|concentration|field/i.test(line) && !currentEdu.field) {
          currentEdu.field = line.replace(/major|concentration|field/i, "").trim();
        }
        // Check for GPA
        else if (/GPA/i.test(line) && !currentEdu.gpa) {
          const gpaMatch = line.match(/GPA\s*[:=]?\s*([\d.]+)/i) || line.match(/(\d\.\d+)\s*GPA/i);
          if (gpaMatch) {
            currentEdu.gpa = gpaMatch[1];
          }
        }
      }
      
      i++;
    }
    
    // Add the last education if it exists
    if (currentEdu && currentEdu.school) {
      education.push(currentEdu);
    }
  }
  
  // If no education section found but there are lines with university/college/degree keywords
  if (education.length === 0) {
    for (const line of lines) {
      if (/university|college|school|institute|bachelor|master|phd|degree|diploma/i.test(line)) {
        const school = line.trim();
        education.push({ school });
        break;
      }
    }
  }
  
  // Limit to 4 education entries
  return education.slice(0, 4);
}
