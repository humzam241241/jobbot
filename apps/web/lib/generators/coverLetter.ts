import { llm } from "@/lib/providers/llm";
import { SYSTEM_COVER_LETTER, createCoverLetterPrompt } from "@/lib/prompts/resumePrompts";
import { Profile } from "@/lib/schemas/profile";

/**
 * Generates a cover letter based on the original profile, tailored profile, and job description
 * @param originalProfile The original profile extracted from the resume
 * @param tailoredProfile The tailored profile with optimized content
 * @param jobDescription The job description text
 * @param modelHint Optional model to use for the LLM
 * @returns The generated cover letter text
 */
export async function generateCoverLetter({
  originalProfile,
  tailoredProfile,
  jobDescription,
  modelHint = "auto"
}: {
  originalProfile: Profile;
  tailoredProfile: Profile;
  jobDescription: string;
  modelHint?: string;
}): Promise<string> {
  try {
    // Create the prompt for the LLM
    const prompt = createCoverLetterPrompt(
      originalProfile,
      tailoredProfile,
      jobDescription
    );
    
    // Call the LLM with the system and user prompts
    const coverLetterText = await llm.complete({
      system: SYSTEM_COVER_LETTER,
      user: prompt,
      model: modelHint
    });
    
    // Validate the cover letter content
    if (!coverLetterText || coverLetterText.trim().length < 100) {
      throw new Error("Generated cover letter is too short or empty");
    }
    
    // Check if the cover letter is different from the resume
    const profileSummary = tailoredProfile.summary || "";
    const firstExpBullet = tailoredProfile.experience[0]?.bullets[0] || "";
    
    // Simple check to ensure cover letter is not just a copy of resume content
    if (
      coverLetterText.includes(profileSummary) ||
      coverLetterText.includes(firstExpBullet)
    ) {
      console.warn("Cover letter may be too similar to resume content");
    }
    
    return coverLetterText;
  } catch (error) {
    console.error("Error generating cover letter:", error);
    throw error;
  }
}

/**
 * Formats the cover letter text into HTML for rendering
 * @param coverLetterText The plain text cover letter
 * @param profile The profile with contact information
 * @returns HTML formatted cover letter
 */
export function formatCoverLetterHtml(
  coverLetterText: string,
  profile: Profile
): string {
  // Split the cover letter into paragraphs
  const paragraphs = coverLetterText
    .split("\n")
    .filter(p => p.trim().length > 0);
  
  // Format the date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  // Create the HTML
  const html = `
    <div class="cover-letter">
      <div class="header">
        <h1>${profile.name}</h1>
        <div class="contact-info">
          ${profile.email ? `<p>${profile.email}</p>` : ""}
          ${profile.phone ? `<p>${profile.phone}</p>` : ""}
          ${profile.website ? `<p>${profile.website}</p>` : ""}
          ${profile.location ? `<p>${profile.location}</p>` : ""}
        </div>
        <p class="date">${formattedDate}</p>
      </div>
      
      <div class="content">
        ${paragraphs.map(p => {
          // Check if paragraph is a bullet point list
          if (p.includes("•") || p.includes("-")) {
            const bullets = p
              .split(/[•\-]/)
              .map(b => b.trim())
              .filter(b => b.length > 0);
            
            return `
              <ul>
                ${bullets.map(b => `<li>${b}</li>`).join("")}
              </ul>
            `;
          }
          
          return `<p>${p}</p>`;
        }).join("")}
      </div>
      
      <div class="signature">
        <p>Sincerely,</p>
        <p>${profile.name}</p>
      </div>
    </div>
  `;
  
  return html;
}
