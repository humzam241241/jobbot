import { renderToPdf } from "@/lib/pipeline/renderToPdf";
import { renderToDocx } from "@/lib/pipeline/renderToDocx";
import { generateResumePdfHtml } from "./resumeHtml";
import { formatCoverLetterHtml } from "./coverLetter";
import { Profile } from "@/lib/schemas/profile";
import { TailoredResume } from "./tailorResume";

/**
 * Generates a PDF resume from a profile and tailored content
 * @param originalProfile The original profile extracted from the resume
 * @param tailoredEdits The tailored content from the LLM
 * @returns Object with paths to the generated PDF
 */
export async function generateResumePdf({
  originalProfile,
  tailoredEdits
}: {
  originalProfile: Profile;
  tailoredEdits: TailoredResume;
}) {
  // Generate the HTML for the resume
  const html = generateResumePdfHtml(originalProfile, tailoredEdits);
  
  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `resume_${timestamp}.pdf`;
  
  // Render the PDF
  return await renderToPdf({
    html,
    title: `${originalProfile.name} - Resume`,
    fileName,
  });
}

/**
 * Generates a DOCX resume from a profile and tailored content
 * @param originalProfile The original profile extracted from the resume
 * @param tailoredEdits The tailored content from the LLM
 * @returns Object with paths to the generated DOCX
 */
export async function generateResumeDocx({
  originalProfile,
  tailoredEdits
}: {
  originalProfile: Profile;
  tailoredEdits: TailoredResume;
}) {
  // Generate the HTML for the resume
  const html = generateResumePdfHtml(originalProfile, tailoredEdits);
  
  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `resume_${timestamp}.docx`;
  
  // Render the DOCX
  return await renderToDocx({
    html,
    fileName,
  });
}

/**
 * Generates a PDF cover letter
 * @param coverLetterText The cover letter text
 * @param profile The profile with contact information
 * @returns Object with paths to the generated PDF
 */
export async function generateCoverLetterPdf({
  coverLetterText,
  profile
}: {
  coverLetterText: string;
  profile: Profile;
}) {
  // Format the cover letter as HTML
  const html = formatCoverLetterHtml(coverLetterText, profile);
  
  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `cover_letter_${timestamp}.pdf`;
  
  // Render the PDF
  return await renderToPdf({
    html,
    title: `${profile.name} - Cover Letter`,
    fileName,
  });
}

/**
 * Generates a DOCX cover letter
 * @param coverLetterText The cover letter text
 * @param profile The profile with contact information
 * @returns Object with paths to the generated DOCX
 */
export async function generateCoverLetterDocx({
  coverLetterText,
  profile
}: {
  coverLetterText: string;
  profile: Profile;
}) {
  // Format the cover letter as HTML
  const html = formatCoverLetterHtml(coverLetterText, profile);
  
  // Generate a unique filename
  const timestamp = Date.now();
  const fileName = `cover_letter_${timestamp}.docx`;
  
  // Render the DOCX
  return await renderToDocx({
    html,
    fileName,
  });
}
