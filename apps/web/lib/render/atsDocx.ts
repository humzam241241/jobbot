import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import fs from "fs/promises";
import path from "path";

export async function renderAtsDocx(kitDir: string, score: { overall: number; notes: string[] }) {
  const children = [];
  
  // Title
  children.push(new Paragraph({ 
    text: "ATS Compatibility Report", 
    heading: HeadingLevel.HEADING_1 
  }));
  children.push(new Paragraph({})); // Spacing
  
  // Overall score
  children.push(new Paragraph({ 
    text: `Overall Score: ${score.overall}/100`,
    heading: HeadingLevel.HEADING_2
  }));
  children.push(new Paragraph({})); // Spacing
  
  // Score interpretation
  let interpretation;
  if (score.overall >= 90) {
    interpretation = "Excellent match! Your resume is highly compatible with this job.";
  } else if (score.overall >= 80) {
    interpretation = "Very good match. Your resume is well-aligned with this position.";
  } else if (score.overall >= 70) {
    interpretation = "Good match. With some improvements, your resume could be even more effective.";
  } else if (score.overall >= 60) {
    interpretation = "Fair match. Consider implementing the recommendations below to improve your chances.";
  } else {
    interpretation = "Needs improvement. Follow the recommendations below to better align your resume with this job.";
  }
  
  children.push(new Paragraph({ text: interpretation }));
  children.push(new Paragraph({})); // Spacing
  
  // Notes and recommendations
  children.push(new Paragraph({ 
    text: "Recommendations",
    heading: HeadingLevel.HEADING_2
  }));
  
  // Add each note as a bullet point
  for (const note of score.notes) {
    children.push(new Paragraph({
      text: note,
      bullet: {
        level: 0
      }
    }));
  }
  
  // Add general ATS tips
  children.push(new Paragraph({})); // Spacing
  children.push(new Paragraph({ 
    text: "General ATS Tips",
    heading: HeadingLevel.HEADING_2
  }));
  
  const atsTips = [
    "Use standard section headings like 'Experience', 'Education', and 'Skills'.",
    "Include keywords from the job description, but don't keyword stuff.",
    "Use a clean, simple format without tables, headers, or footers.",
    "Save your resume as a .docx or .pdf file.",
    "Quantify your achievements with numbers and metrics when possible.",
    "Avoid using images, icons, or special characters."
  ];
  
  for (const tip of atsTips) {
    children.push(new Paragraph({
      text: tip,
      bullet: {
        level: 0
      }
    }));
  }
  
  const doc = new Document({
    sections: [{
      children: children
    }]
  });
  
  const out = path.join(kitDir, "ats_report.docx");
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(out, buffer);
  return out;
}
