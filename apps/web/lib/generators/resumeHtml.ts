import { Profile } from "@/lib/schemas/profile";
import { TailoredResume } from "./tailorResume";

/**
 * Generates HTML for a resume based on the profile and tailored content
 * @param originalProfile The original profile extracted from the resume
 * @param tailoredEdits The tailored content from the LLM
 * @returns HTML string for the resume
 */
export function generateResumeHtml(
  originalProfile: Profile,
  tailoredEdits: TailoredResume
): string {
  // Start with the header (name and contact info)
  let html = `
    <div class="resume">
      <header>
        <h1>${originalProfile.name}</h1>
        <div class="contact-info">
          ${originalProfile.email ? `<span>${originalProfile.email}</span>` : ""}
          ${originalProfile.phone ? `<span>${originalProfile.phone}</span>` : ""}
          ${originalProfile.website ? `<span>${originalProfile.website}</span>` : ""}
          ${originalProfile.location ? `<span>${originalProfile.location}</span>` : ""}
        </div>
      </header>
  `;

  // Add summary section if available
  if (tailoredEdits.summary) {
    html += `
      <section class="summary">
        <h2>Summary</h2>
        <p>${tailoredEdits.summary}</p>
      </section>
    `;
  }

  // Add skills section if available
  if (tailoredEdits.skills && tailoredEdits.skills.length > 0) {
    html += `
      <section class="skills">
        <h2>Skills</h2>
        <p>${tailoredEdits.skills.join(", ")}</p>
      </section>
    `;
  }

  // Add experience section
  if (originalProfile.experience && originalProfile.experience.length > 0) {
    html += `
      <section class="experience">
        <h2>Experience</h2>
    `;

    // Map original experience with tailored content
    originalProfile.experience.forEach((exp, index) => {
      // Find the tailored experience for this index
      const tailoredExp = tailoredEdits.experience.find(te => te.index === index);
      
      // Use tailored content if available, otherwise use original
      const title = tailoredExp?.title || exp.title;
      const company = tailoredExp?.company || exp.company;
      const location = tailoredExp?.location || exp.location;
      const startDate = tailoredExp?.startDate || exp.startDate;
      const endDate = tailoredExp?.endDate || exp.endDate;
      const bullets = tailoredExp?.bullets || exp.bullets;

      html += `
        <div class="experience-item">
          <h3>${title}</h3>
          <div class="company-info">
            <span class="company">${company}</span>
            ${location ? `<span class="location">${location}</span>` : ""}
            ${startDate ? `<span class="date">${startDate}${endDate ? ` - ${endDate}` : ""}</span>` : ""}
          </div>
          ${bullets && bullets.length > 0 ? `
            <ul>
              ${bullets.map(bullet => `<li>${bullet}</li>`).join("")}
            </ul>
          ` : ""}
        </div>
      `;
    });

    html += `
      </section>
    `;
  }

  // Add education section
  if (originalProfile.education && originalProfile.education.length > 0) {
    html += `
      <section class="education">
        <h2>Education</h2>
    `;

    // Map original education with tailored content
    originalProfile.education.forEach((edu, index) => {
      // Find the tailored education for this index
      const tailoredEdu = tailoredEdits.education.find(te => te.index === index);
      
      // Use tailored content if available, otherwise use original
      const school = tailoredEdu?.school || edu.school;
      const degree = tailoredEdu?.degree || edu.degree;
      const field = tailoredEdu?.field || edu.field;
      const startDate = tailoredEdu?.startDate || edu.startDate;
      const endDate = tailoredEdu?.endDate || edu.endDate;
      const gpa = tailoredEdu?.gpa || edu.gpa;

      html += `
        <div class="education-item">
          <h3>${school}</h3>
          <div class="degree-info">
            ${degree ? `<span class="degree">${degree}</span>` : ""}
            ${field ? `<span class="field">${field}</span>` : ""}
            ${startDate ? `<span class="date">${startDate}${endDate ? ` - ${endDate}` : ""}</span>` : ""}
            ${gpa ? `<span class="gpa">GPA: ${gpa}</span>` : ""}
          </div>
        </div>
      `;
    });

    html += `
      </section>
    `;
  }

  // Close the resume div
  html += `
    </div>
  `;

  return html;
}

/**
 * Generates a PDF from a profile and tailored content
 * @param originalProfile The original profile extracted from the resume
 * @param tailoredEdits The tailored content from the LLM
 * @returns The HTML string for the resume
 */
export function generateResumePdfHtml(
  originalProfile: Profile,
  tailoredEdits: TailoredResume
): string {
  const html = generateResumeHtml(originalProfile, tailoredEdits);
  
  // Add CSS for PDF rendering
  return `
    <style>
      .resume {
        font-family: 'Arial', sans-serif;
        line-height: 1.4;
        max-width: 800px;
        margin: 0 auto;
      }
      
      header {
        margin-bottom: 20px;
      }
      
      h1 {
        font-size: 24px;
        margin: 0 0 10px 0;
      }
      
      h2 {
        font-size: 18px;
        border-bottom: 1px solid #ccc;
        margin: 20px 0 10px 0;
        padding-bottom: 5px;
      }
      
      h3 {
        font-size: 16px;
        margin: 0;
      }
      
      .contact-info {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 14px;
      }
      
      .contact-info span:not(:last-child)::after {
        content: " | ";
      }
      
      section {
        margin-bottom: 20px;
      }
      
      .experience-item, .education-item {
        margin-bottom: 15px;
      }
      
      .company-info, .degree-info {
        font-size: 14px;
        margin-bottom: 5px;
      }
      
      .company, .degree {
        font-weight: bold;
      }
      
      .location, .field, .date, .gpa {
        margin-left: 10px;
      }
      
      ul {
        margin: 5px 0 0 20px;
        padding: 0;
      }
      
      li {
        margin-bottom: 5px;
      }
    </style>
    ${html}
  `;
}
