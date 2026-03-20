import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip, LevelFormat } from 'docx';
import { NormalizedResume } from '@/lib/types/resume';
import { optimizeLayout, generateHtml } from '@/lib/format/pageLayout';
async function lazyHtmlToPdf() {
  const mod = await import('html-pdf-node');
  return mod.default;
}
import JSZip from 'jszip';

interface DocumentOptions {
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

function createDocxDocument(resume: NormalizedResume, options: DocumentOptions = {}): Document {
  const margins = options.margins || {
    top: convertInchesToTwip(0.5),
    bottom: convertInchesToTwip(0.5),
    left: convertInchesToTwip(0.5),
    right: convertInchesToTwip(0.5)
  };

  // Calculate optimal spacing based on content length
  const totalBullets = 
    resume.experience.reduce((acc, exp) => acc + exp.bullets.length, 0) +
    resume.projects.reduce((acc, proj) => acc + proj.bullets.length, 0) +
    resume.education.reduce((acc, edu) => acc + edu.details.length, 0);

  const spacing = {
    after: totalBullets > 15 ? 120 : 200,
    before: totalBullets > 15 ? 120 : 200,
    line: totalBullets > 15 ? 240 : 300
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: margins
        }
      },
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200
          },
          children: [
            new TextRun({
              text: resume.header.name,
              bold: true,
              size: 28
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400
          },
          children: [
            new TextRun(`${resume.header.email} | ${resume.header.phone} | ${resume.header.location}`)
          ]
        }),

        // Summary
        ...(resume.summary ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            text: "Professional Summary"
          }),
          new Paragraph(resume.summary)
        ] : []),

        // Skills
        ...(Object.keys(resume.skills).length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            text: "Technical Skills"
          }),
          ...Object.entries(resume.skills).map(([category, skills]) => 
            new Paragraph({
              children: [
                new TextRun({
                  text: `${category}: `,
                  bold: true
                }),
                new TextRun(skills.join(', '))
              ]
            })
          )
        ] : []),

        // Experience
        ...(resume.experience.length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            text: "Professional Experience"
          }),
          ...resume.experience.flatMap(exp => [
            new Paragraph({
              spacing: {
                before: 400
              },
              children: [
                new TextRun({
                  text: exp.role,
                  bold: true
                }),
                new TextRun(" | "),
                new TextRun(exp.organization)
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${exp.startDate} - ${exp.endDate}`,
                  italics: true
                })
              ]
            }),
            ...exp.bullets.map(bullet =>
              new Paragraph({
                bullet: {
                  level: 0
                },
                text: bullet
              })
            )
          ])
        ] : []),

        // Projects
        ...(resume.projects.length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            text: "Projects"
          }),
          ...resume.projects.flatMap(proj => [
            new Paragraph({
              spacing: {
                before: 400
              },
              children: [
                new TextRun({
                  text: proj.name,
                  bold: true
                }),
                new TextRun(" | "),
                new TextRun(proj.date)
              ]
            }),
            ...proj.bullets.map(bullet =>
              new Paragraph({
                bullet: {
                  level: 0
                },
                text: bullet
              })
            )
          ])
        ] : []),

        // Education
        ...(resume.education.length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            text: "Education"
          }),
          ...resume.education.flatMap(edu => [
            new Paragraph({
              spacing: {
                before: 400
              },
              children: [
                new TextRun({
                  text: edu.degree,
                  bold: true
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun(`${edu.school} | ${edu.dates}`)
              ]
            }),
            ...edu.details.map(detail =>
              new Paragraph({
                bullet: {
                  level: 0
                },
                text: detail
              })
            )
          ])
        ] : [])
      ]
    }]
  });

  return doc;
}

async function generatePdf(resume: NormalizedResume): Promise<Buffer> {
  const layout = optimizeLayout(resume);
  const html = generateHtml(resume, layout);

  const buffer = await (await lazyHtmlToPdf()).generatePdf(
    { content: html },
    { 
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: `${layout.margins.top}in`,
        bottom: `${layout.margins.bottom}in`,
        left: `${layout.margins.left}in`,
        right: `${layout.margins.right}in`
      },
      height: '11in',
      width: '8.5in',
      scale: 1,
      displayHeaderFooter: false
    }
  );

  return buffer;
}

export async function generateDocuments(
  resume: NormalizedResume,
  atsReport: string
): Promise<{ zipBuffer: Buffer; metrics: { words: number } }> {
  // Create documents
  const docx = createDocxDocument(resume);
  const docxBuffer = await docx.save();
  const pdfBuffer = await generatePdf(resume);
  const atsReportBuffer = await (await lazyHtmlToPdf()).generatePdf(
    { content: atsReport },
    { format: 'Letter' }
  );

  // Create ZIP archive
  const zip = new JSZip();
  zip.file('tailored_resume.docx', docxBuffer);
  zip.file('tailored_resume.pdf', pdfBuffer);
  zip.file('ats_report.pdf', atsReportBuffer);

  // Calculate metrics
  const words = resume.summary.split(/\s+/).length +
    Object.values(resume.skills).flat().length +
    resume.experience.reduce((acc, exp) => acc + exp.bullets.join(' ').split(/\s+/).length, 0) +
    resume.projects.reduce((acc, proj) => acc + proj.bullets.join(' ').split(/\s+/).length, 0) +
    resume.education.reduce((acc, edu) => acc + edu.details.join(' ').split(/\s+/).length, 0);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return {
    zipBuffer,
    metrics: {
      words
    }
  };
}
