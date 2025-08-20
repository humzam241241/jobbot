import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";

export type StyleManifest = {
  headingFont?: string; 
  bodyFont?: string;
  headingSize?: number; 
  bodySize?: number;
  bulletIndentTwip?: number; 
  sectionSpacing?: number;
};

export async function renderResumeDocx(blocks: any, style: StyleManifest = {}): Promise<Buffer> {
  // Default style values
  const headingFont = style.headingFont || "Calibri";
  const bodyFont = style.bodyFont || "Calibri";
  const headingSize = style.headingSize || 24;
  const bodySize = style.bodySize || 11;
  const bulletIndent = style.bulletIndentTwip || 720; // 0.5 inch in twips
  const sectionSpacing = style.sectionSpacing || 12;
  
  // Create document sections
  const sections: Paragraph[] = [];
  
  // Add header section
  if (blocks.Header) {
    // Name
    if (blocks.Header.name) {
      sections.push(
        new Paragraph({
          text: blocks.Header.name,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          style: "nameStyle",
        })
      );
    }
    
    // Contact info
    const contactInfo = [
      blocks.Header.email,
      blocks.Header.phone,
      blocks.Header.location
    ].filter(Boolean).join(" • ");
    
    if (contactInfo) {
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: contactInfo,
              size: bodySize * 2,
            }),
          ],
        })
      );
    }
    
    // Links
    if (blocks.Header.links && Array.isArray(blocks.Header.links) && blocks.Header.links.length > 0) {
      const linksText = blocks.Header.links
        .map((link: any) => `${link.label}: ${link.url}`)
        .join(" • ");
        
      sections.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: linksText,
              size: bodySize * 2,
            }),
          ],
        })
      );
    }
  }
  
  // Add Summary section
  if (blocks.Summary) {
    sections.push(
      new Paragraph({
        text: "SUMMARY",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        style: "sectionHeading",
        border: {
          bottom: {
            color: "999999",
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
      })
    );
    
    sections.push(
      new Paragraph({
        text: blocks.Summary,
        spacing: { after: 240 },
      })
    );
  }
  
  // Add Skills section
  if (blocks.Skills) {
    sections.push(
      new Paragraph({
        text: "SKILLS",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        style: "sectionHeading",
        border: {
          bottom: {
            color: "999999",
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
      })
    );
    
    // Handle different formats of skills
    if (typeof blocks.Skills === 'string') {
      sections.push(
        new Paragraph({
          text: blocks.Skills,
          spacing: { after: 240 },
        })
      );
    } else if (typeof blocks.Skills === 'object') {
      // Handle skills as an object with categories
      Object.entries(blocks.Skills).forEach(([category, skills]: [string, any]) => {
        sections.push(
          new Paragraph({
            text: `${category}: ${Array.isArray(skills) ? skills.join(", ") : skills}`,
            spacing: { after: 120 },
          })
        );
      });
      
      // Add extra spacing after skills section
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 120 },
        })
      );
    }
  }
  
  // Add Experience section
  if (blocks.Experience && Array.isArray(blocks.Experience) && blocks.Experience.length > 0) {
    sections.push(
      new Paragraph({
        text: "EXPERIENCE",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        style: "sectionHeading",
        border: {
          bottom: {
            color: "999999",
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
      })
    );
    
    blocks.Experience.forEach((exp: any) => {
      // Job title and company
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: exp.role || exp.title || "",
              bold: true,
            }),
            new TextRun({
              text: exp.organization || exp.company ? `, ${exp.organization || exp.company}` : "",
            }),
            new TextRun({
              text: exp.location ? ` | ${exp.location}` : "",
            }),
          ],
        })
      );
      
      // Dates
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${exp.startDate || ""} - ${exp.endDate || "Present"}`,
              italics: true,
            }),
          ],
        })
      );
      
      // Bullets
      if (exp.bullets && Array.isArray(exp.bullets)) {
        exp.bullets.forEach((bullet: string) => {
          sections.push(
            new Paragraph({
              text: `• ${bullet}`,
              spacing: { after: 60 },
              indent: { left: bulletIndent },
            })
          );
        });
      }
      
      // Add spacing after each experience
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 120 },
        })
      );
    });
  }
  
  // Add Projects section
  if (blocks.Projects && Array.isArray(blocks.Projects) && blocks.Projects.length > 0) {
    sections.push(
      new Paragraph({
        text: "PROJECTS",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        style: "sectionHeading",
        border: {
          bottom: {
            color: "999999",
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
      })
    );
    
    blocks.Projects.forEach((project: any) => {
      // Project name
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: project.name || "",
              bold: true,
            }),
            new TextRun({
              text: project.date ? ` | ${project.date}` : "",
            }),
          ],
        })
      );
      
      // Bullets
      if (project.bullets && Array.isArray(project.bullets)) {
        project.bullets.forEach((bullet: string) => {
          sections.push(
            new Paragraph({
              text: `• ${bullet}`,
              spacing: { after: 60 },
              indent: { left: bulletIndent },
            })
          );
        });
      }
      
      // Add spacing after each project
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 120 },
        })
      );
    });
  }
  
  // Add Education section
  if (blocks.Education && Array.isArray(blocks.Education) && blocks.Education.length > 0) {
    sections.push(
      new Paragraph({
        text: "EDUCATION",
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 120 },
        style: "sectionHeading",
        border: {
          bottom: {
            color: "999999",
            style: BorderStyle.SINGLE,
            size: 1,
          },
        },
      })
    );
    
    blocks.Education.forEach((edu: any) => {
      // Degree and institution
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: edu.degree || "",
              bold: true,
            }),
            new TextRun({
              text: edu.institution ? `, ${edu.institution}` : "",
            }),
          ],
        })
      );
      
      // Dates
      sections.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: edu.dates || "",
              italics: true,
            }),
          ],
        })
      );
      
      // Details
      if (edu.details && Array.isArray(edu.details)) {
        edu.details.forEach((detail: string) => {
          sections.push(
            new Paragraph({
              text: `• ${detail}`,
              spacing: { after: 60 },
              indent: { left: bulletIndent },
            })
          );
        });
      }
      
      // Add spacing after each education entry
      sections.push(
        new Paragraph({
          text: "",
          spacing: { after: 120 },
        })
      );
    });
  }
  
  // Create the document with the sections
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch in twips
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: sections,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "nameStyle",
          name: "Name Style",
          run: {
            font: headingFont,
            size: headingSize * 2,
            bold: true,
          },
        },
        {
          id: "sectionHeading",
          name: "Section Heading",
          run: {
            font: headingFont,
            size: headingSize,
            bold: true,
          },
        },
      ],
    },
  });
  
  // Generate buffer from the document
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
