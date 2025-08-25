import { Document, Packer, Paragraph, HeadingLevel, TextRun, ExternalHyperlink, BulletList, Numbering } from "docx";
import fs from "fs/promises";
import path from "path";
import type { ResumeIR } from "../ir/types";

export async function renderResumeDocx(kitDir: string, ir: ResumeIR) {
  const children: Paragraph[] = [];

  // Contact information
  if (ir.meta.name || ir.meta.email || ir.meta.phone) {
    children.push(
      new Paragraph({
        text: ir.meta.name || '',
        heading: HeadingLevel.HEADING_1,
        alignment: 'center'
      })
    );

    const contactInfo = [];
    if (ir.meta.email) contactInfo.push(ir.meta.email);
    if (ir.meta.phone) contactInfo.push(ir.meta.phone);
    if (ir.meta.links && ir.meta.links.length > 0) {
      contactInfo.push(...ir.meta.links);
    }

    if (contactInfo.length > 0) {
      children.push(
        new Paragraph({
          text: contactInfo.join(' | '),
          alignment: 'center'
        })
      );
    }

    // Add spacing after contact info
    children.push(new Paragraph({}));
  }

  // Process each section
  for (const section of ir.sections) {
    switch (section.type) {
      case 'summary':
        if (section.text) {
          children.push(
            new Paragraph({
              text: "Summary",
              heading: HeadingLevel.HEADING_2
            })
          );
          children.push(new Paragraph({ text: section.text }));
          children.push(new Paragraph({})); // Add spacing
        }
        break;

      case 'skills':
        children.push(
          new Paragraph({
            text: "Skills",
            heading: HeadingLevel.HEADING_2
          })
        );
        
        if (section.items && section.items.length > 0) {
          children.push(
            new Paragraph({
              text: section.items.join(', ')
            })
          );
        }
        
        children.push(new Paragraph({})); // Add spacing
        break;

      case 'experience':
        children.push(
          new Paragraph({
            text: "Experience",
            heading: HeadingLevel.HEADING_2
          })
        );
        
        if (section.roles && section.roles.length > 0) {
          for (const role of section.roles) {
            // Title and company
            const titleCompany = `${role.title}${role.company ? ' at ' + role.company : ''}`;
            children.push(
              new Paragraph({
                text: titleCompany,
                heading: HeadingLevel.HEADING_3
              })
            );
            
            // Dates
            if (role.dates) {
              children.push(
                new Paragraph({
                  text: role.dates
                })
              );
            }
            
            // Bullets
            if (role.bullets && role.bullets.length > 0) {
              for (const bullet of role.bullets) {
                children.push(
                  new Paragraph({
                    text: bullet,
                    bullet: {
                      level: 0
                    }
                  })
                );
              }
            }
            
            children.push(new Paragraph({})); // Add spacing between roles
          }
        }
        break;

      case 'education':
        children.push(
          new Paragraph({
            text: "Education",
            heading: HeadingLevel.HEADING_2
          })
        );
        
        if (section.items && section.items.length > 0) {
          for (const edu of section.items) {
            // School and credential
            const schoolCredential = `${edu.school}${edu.credential ? ', ' + edu.credential : ''}`;
            children.push(
              new Paragraph({
                text: schoolCredential,
                heading: HeadingLevel.HEADING_3
              })
            );
            
            // Dates
            if (edu.dates) {
              children.push(
                new Paragraph({
                  text: edu.dates
                })
              );
            }
            
            // Bullets
            if (edu.bullets && edu.bullets.length > 0) {
              for (const bullet of edu.bullets) {
                children.push(
                  new Paragraph({
                    text: bullet,
                    bullet: {
                      level: 0
                    }
                  })
                );
              }
            }
            
            children.push(new Paragraph({})); // Add spacing between education items
          }
        }
        break;

      case 'projects':
        children.push(
          new Paragraph({
            text: "Projects",
            heading: HeadingLevel.HEADING_2
          })
        );
        
        if (section.items && section.items.length > 0) {
          for (const project of section.items) {
            // Project name
            children.push(
              new Paragraph({
                text: project.name,
                heading: HeadingLevel.HEADING_3
              })
            );
            
            // Bullets
            if (project.bullets && project.bullets.length > 0) {
              for (const bullet of project.bullets) {
                children.push(
                  new Paragraph({
                    text: bullet,
                    bullet: {
                      level: 0
                    }
                  })
                );
              }
            }
            
            children.push(new Paragraph({})); // Add spacing between projects
          }
        }
        break;

      case 'certs':
        children.push(
          new Paragraph({
            text: "Certifications",
            heading: HeadingLevel.HEADING_2
          })
        );
        
        if (section.items && section.items.length > 0) {
          for (const cert of section.items) {
            children.push(
              new Paragraph({
                text: cert,
                bullet: {
                  level: 0
                }
              })
            );
          }
        }
        
        children.push(new Paragraph({})); // Add spacing
        break;
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const out = path.join(kitDir, "resume_tailored.docx");
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(out, buffer);
  return out;
}
