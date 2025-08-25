import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import fs from "fs/promises";
import path from "path";
import type { ResumeIR } from "../ir/types";
import type { TailoringPlan } from "../ai/schemas";

export async function renderCoverDocx(kitDir: string, ir: ResumeIR, plan: TailoringPlan, company?: string) {
  const children = [];
  
  // Current date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  children.push(new Paragraph({ text: formattedDate }));
  children.push(new Paragraph({})); // Spacing
  
  // Contact info from resume
  if (ir.meta.name) {
    children.push(new Paragraph({ text: ir.meta.name }));
  }
  
  if (ir.meta.email) {
    children.push(new Paragraph({ text: ir.meta.email }));
  }
  
  if (ir.meta.phone) {
    children.push(new Paragraph({ text: ir.meta.phone }));
  }
  
  children.push(new Paragraph({})); // Spacing
  
  // Recipient
  children.push(new Paragraph({ text: "Hiring Manager" }));
  if (company) {
    children.push(new Paragraph({ text: company }));
  }
  children.push(new Paragraph({})); // Spacing
  
  // Re: line
  children.push(new Paragraph({ text: `Re: ${plan.targetRole}${company ? ` at ${company}` : ""}` }));
  children.push(new Paragraph({})); // Spacing
  
  // Greeting
  children.push(new Paragraph({ text: "Dear Hiring Manager," }));
  children.push(new Paragraph({})); // Spacing
  
  // Introduction paragraph based on summary
  children.push(new Paragraph({ text: `I am writing to express my interest in the ${plan.targetRole} position${company ? ` at ${company}` : ""}. ${plan.summaryRewrite}` }));
  children.push(new Paragraph({})); // Spacing
  
  // Middle paragraphs highlighting key skills and experience
  // Use matched keywords and added bullets as highlights
  const highlights = [];
  
  if (plan.matchedKeywords.length > 0) {
    const keywordHighlight = `My experience includes key skills that align with your requirements, including ${plan.matchedKeywords.slice(0, 5).join(', ')}.`;
    highlights.push(keywordHighlight);
  }
  
  // Mention experience highlights
  const experienceSection = ir.sections.find(s => s.type === 'experience') as any;
  if (experienceSection?.roles?.length > 0) {
    const recentRole = experienceSection.roles[0];
    const experienceHighlight = `In my role as ${recentRole.title}${recentRole.company ? ` at ${recentRole.company}` : ''}, I have demonstrated the skills and expertise that would make me a strong candidate for this position.`;
    highlights.push(experienceHighlight);
  }
  
  // Add any bullet points that were added during tailoring
  const addedBullets = plan.addBullets.flatMap(add => add.bullets).slice(0, 2);
  if (addedBullets.length > 0) {
    const bulletHighlight = `Some of my key accomplishments include: ${addedBullets.join(' ')}`;
    highlights.push(bulletHighlight);
  }
  
  // Add the highlights to the document
  for (const highlight of highlights) {
    children.push(new Paragraph({ text: highlight }));
    children.push(new Paragraph({})); // Spacing
  }
  
  // Closing paragraph
  children.push(new Paragraph({ 
    text: `I am excited about the opportunity to bring my skills and experience to ${company || 'your organization'} and would welcome the chance to discuss how I can contribute to your team. Thank you for considering my application. I look forward to the possibility of working with you.`
  }));
  children.push(new Paragraph({})); // Spacing
  
  // Closing
  children.push(new Paragraph({ text: "Sincerely," }));
  children.push(new Paragraph({})); // Spacing
  children.push(new Paragraph({})); // Spacing
  children.push(new Paragraph({ text: ir.meta.name || "Applicant" }));
  
  const doc = new Document({
    sections: [{
      children: children
    }]
  });
  
  const out = path.join(kitDir, "cover_letter.docx");
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(out, buffer);
  return out;
}
