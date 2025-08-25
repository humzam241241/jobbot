import mammoth from "mammoth";
import fs from "fs/promises";
import { JSDOM } from "jsdom";
import type { ResumeIR } from "../ir/types";

// Minimal v1: parse to HTML, then tokenize into sections with simple heuristics.
// Later we can parse document.xml directly for deeper fidelity.

export async function parseDocxToIR(docxPath: string): Promise<ResumeIR> {
  const buffer = await fs.readFile(docxPath);
  const { value: html } = await mammoth.convertToHtml({ buffer });

  // Initialize the IR structure
  const ir: ResumeIR = {
    meta: {},
    sections: [],
    anchors: { headingMap: {} }
  };

  // Create a DOM from the HTML using jsdom
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract contact information (usually at the top)
  const firstParagraph = doc.querySelector("p");
  if (firstParagraph) {
    const contactText = firstParagraph.textContent || "";
    
    // Extract email using regex
    const emailMatch = contactText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      ir.meta.email = emailMatch[0];
    }
    
    // Extract phone using regex
    const phoneMatch = contactText.match(/\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/);
    if (phoneMatch) {
      ir.meta.phone = phoneMatch[0];
    }
    
    // Assume the name is the first line if it doesn't contain email or phone
    if (!contactText.includes("@") && !phoneMatch) {
      ir.meta.name = contactText.trim();
    }
  }

  // Find headings to identify sections
  const headings = Array.from(doc.querySelectorAll("h1, h2, h3"));
  
  // Process each heading and the content that follows it
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const headingText = heading.textContent?.trim().toLowerCase() || "";
    
    // Determine section type based on heading text
    let sectionType: string | null = null;
    
    if (/summary|profile|objective|about/.test(headingText)) {
      sectionType = 'summary';
    } else if (/skills|technologies|competencies|proficiencies/.test(headingText)) {
      sectionType = 'skills';
    } else if (/experience|employment|work|career|history/.test(headingText)) {
      sectionType = 'experience';
    } else if (/projects|portfolio/.test(headingText)) {
      sectionType = 'projects';
    } else if (/education|academic|degree|university|college|school/.test(headingText)) {
      sectionType = 'education';
    } else if (/certifications|certificates|credentials/.test(headingText)) {
      sectionType = 'certs';
    }
    
    // Skip if we couldn't identify the section type
    if (!sectionType) continue;
    
    // Collect content until the next heading
    let content: Element | null = heading.nextElementSibling;
    const contentElements: Element[] = [];
    
    while (content && 
           (i === headings.length - 1 || content !== headings[i + 1]) && 
           !content.tagName.match(/^H[1-3]$/i)) {
      contentElements.push(content);
      content = content.nextElementSibling;
    }
    
    // Process the content based on section type
    switch (sectionType) {
      case 'summary':
        ir.sections.push({
          type: 'summary',
          text: contentElements.map(el => el.textContent).join(' ').trim()
        });
        break;
        
      case 'skills':
        // Extract skills from paragraphs or lists
        const skillItems: string[] = [];
        contentElements.forEach(el => {
          if (el.tagName === 'UL' || el.tagName === 'OL') {
            Array.from(el.querySelectorAll('li')).forEach(li => {
              skillItems.push(li.textContent?.trim() || '');
            });
          } else {
            // For paragraphs, split by commas or bullets
            const text = el.textContent || '';
            const items = text.split(/[,•]/).map(s => s.trim()).filter(Boolean);
            skillItems.push(...items);
          }
        });
        ir.sections.push({
          type: 'skills',
          items: skillItems
        });
        break;
        
      case 'experience':
        const roles: any[] = [];
        let currentRole: any = null;
        
        contentElements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // New role typically starts with a heading or bold text
          if (el.tagName.match(/^H[4-6]$/i) || el.querySelector('strong, b') || el.tagName === 'STRONG' || el.tagName === 'B') {
            if (currentRole) {
              roles.push(currentRole);
            }
            
            // Parse title and company
            const parts = text.split(/\s+at\s+|\s*[,|-]\s*/);
            currentRole = {
              title: parts[0] || '',
              company: parts[1] || '',
              bullets: []
            };
            
            // Try to extract dates
            const dateMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4}|\w+\s+\d{4})\b/i);
            if (dateMatch) {
              currentRole.dates = dateMatch[0];
            }
          } else if (el.tagName === 'UL' || el.tagName === 'OL') {
            // Bullet points
            if (currentRole) {
              Array.from(el.querySelectorAll('li')).forEach(li => {
                currentRole.bullets.push(li.textContent?.trim() || '');
              });
            }
          } else if (currentRole && text) {
            // Additional description or bullet point
            if (text.startsWith('•') || text.startsWith('-')) {
              currentRole.bullets.push(text.substring(1).trim());
            } else if (currentRole.bullets.length === 0) {
              // Might be a date or location
              if (!currentRole.dates && /\b\d{4}\b/.test(text)) {
                currentRole.dates = text;
              }
            }
          }
        });
        
        // Add the last role
        if (currentRole) {
          roles.push(currentRole);
        }
        
        ir.sections.push({
          type: 'experience',
          roles
        });
        break;
        
      case 'education':
        const educationItems: any[] = [];
        let currentEdu: any = null;
        
        contentElements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // New education item typically starts with a heading or bold text
          if (el.tagName.match(/^H[4-6]$/i) || el.querySelector('strong, b') || el.tagName === 'STRONG' || el.tagName === 'B') {
            if (currentEdu) {
              educationItems.push(currentEdu);
            }
            
            // Parse school and credential
            const parts = text.split(/\s*[,|-]\s*/);
            currentEdu = {
              school: parts[0] || '',
              credential: parts[1] || '',
              bullets: []
            };
            
            // Try to extract dates
            const dateMatch = text.match(/\b\d{4}\s*(-|–|to)\s*(Present|Current|Now|\d{4})\b/i);
            if (dateMatch) {
              currentEdu.dates = dateMatch[0];
            }
          } else if (el.tagName === 'UL' || el.tagName === 'OL') {
            // Bullet points
            if (currentEdu) {
              Array.from(el.querySelectorAll('li')).forEach(li => {
                currentEdu.bullets.push(li.textContent?.trim() || '');
              });
            }
          } else if (currentEdu && text) {
            // Additional description or bullet point
            if (text.startsWith('•') || text.startsWith('-')) {
              currentEdu.bullets.push(text.substring(1).trim());
            } else if (currentEdu.bullets.length === 0) {
              // Might be a date
              if (!currentEdu.dates && /\b\d{4}\b/.test(text)) {
                currentEdu.dates = text;
              }
            }
          }
        });
        
        // Add the last education item
        if (currentEdu) {
          educationItems.push(currentEdu);
        }
        
        ir.sections.push({
          type: 'education',
          items: educationItems
        });
        break;
        
      case 'projects':
        const projectItems: any[] = [];
        let currentProject: any = null;
        
        contentElements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // New project typically starts with a heading or bold text
          if (el.tagName.match(/^H[4-6]$/i) || el.querySelector('strong, b') || el.tagName === 'STRONG' || el.tagName === 'B') {
            if (currentProject) {
              projectItems.push(currentProject);
            }
            
            currentProject = {
              name: text,
              bullets: []
            };
          } else if (el.tagName === 'UL' || el.tagName === 'OL') {
            // Bullet points
            if (currentProject) {
              Array.from(el.querySelectorAll('li')).forEach(li => {
                currentProject.bullets.push(li.textContent?.trim() || '');
              });
            }
          } else if (currentProject && text) {
            // Additional description or bullet point
            if (text.startsWith('•') || text.startsWith('-')) {
              currentProject.bullets.push(text.substring(1).trim());
            }
          }
        });
        
        // Add the last project
        if (currentProject) {
          projectItems.push(currentProject);
        }
        
        ir.sections.push({
          type: 'projects',
          items: projectItems
        });
        break;
        
      case 'certs':
        // Extract certifications from paragraphs or lists
        const certItems: string[] = [];
        contentElements.forEach(el => {
          if (el.tagName === 'UL' || el.tagName === 'OL') {
            Array.from(el.querySelectorAll('li')).forEach(li => {
              certItems.push(li.textContent?.trim() || '');
            });
          } else {
            // For paragraphs, each paragraph is a certification
            const text = el.textContent?.trim() || '';
            if (text) certItems.push(text);
          }
        });
        ir.sections.push({
          type: 'certs',
          items: certItems
        });
        break;
    }
  }
  
  // If we couldn't find a summary section, add an empty one
  if (!ir.sections.find(s => s.type === 'summary')) {
    ir.sections.unshift({ type: 'summary', text: '' });
  }

  return ir;
}