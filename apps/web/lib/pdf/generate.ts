import PDFDocument from 'pdfkit';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('pdf-generator');

interface PdfGenerateOptions {
  content: string;
  title?: string;
  maxPages?: number;
  fontSize?: number;
  fontFamily?: string;
  outputDir?: string;
}

interface ResumeContent {
  summary?: string;
  experience?: Array<{
    company?: string;
    role?: string;
    bullets?: string[];
  }>;
  projects?: Array<{
    name?: string;
    bullets?: string[];
  }>;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    year?: string;
  }>;
}

/**
 * Generates a PDF from content with strict page limit
 */
export async function generatePdf(options: PdfGenerateOptions): Promise<{ buffer: Buffer; filePath: string }> {
  const {
    content,
    title = 'Generated Document',
    maxPages = 1,
    fontSize = 11,
    fontFamily = 'Helvetica',
    outputDir = path.join(process.cwd(), 'public', 'outputs')
  } = options;

  logger.info('Generating PDF', { title, maxPages });

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clean up old files (keep last 100)
  cleanupOldFiles(outputDir, 100);

  return new Promise((resolve, reject) => {
    try {
      // Parse JSON content
      let resumeContent: ResumeContent;
      try {
        resumeContent = JSON.parse(content);
      } catch (e) {
        logger.warn('Failed to parse JSON, treating as plain text', { error: e });
        resumeContent = { summary: content };
      }

      // Create a document
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true // Enable page buffering for page count check
      });

      // Generate unique file path
      const id = uuidv4();
      const filePath = path.join(outputDir, `${id}.pdf`);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Buffer to store PDF data
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve({ buffer: pdfData, filePath });
      });

      // Add title
      doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 4);
      doc.text(title, { align: 'center' });
      doc.moveDown(1);

      // Track content that fits
      let contentFits = true;

      // Add summary
      if (resumeContent.summary) {
        doc.font(fontFamily).fontSize(fontSize);
        doc.text(resumeContent.summary, { align: 'left' });
        doc.moveDown(1);
      }

      // Add experience
      if (resumeContent.experience?.length) {
        doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 2);
        doc.text('EXPERIENCE', { align: 'left' });
        doc.moveDown(0.5);

        for (const exp of resumeContent.experience) {
          if (doc.bufferedPageRange().count > maxPages) {
            contentFits = false;
            break;
          }

          doc.font(`${fontFamily}-Bold`).fontSize(fontSize);
          doc.text(exp.company || '', { continued: true });
          doc.font(fontFamily).fontSize(fontSize);
          doc.text(` - ${exp.role || ''}`, { align: 'left' });

          if (exp.bullets?.length) {
            doc.moveDown(0.5);
            for (const bullet of exp.bullets) {
              doc.text(`• ${bullet}`, { indent: 15, align: 'left' });
            }
          }
          doc.moveDown(1);
        }
      }

      // Add projects
      if (resumeContent.projects?.length) {
        if (doc.bufferedPageRange().count <= maxPages) {
          doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 2);
          doc.text('PROJECTS', { align: 'left' });
          doc.moveDown(0.5);

          for (const project of resumeContent.projects) {
            if (doc.bufferedPageRange().count > maxPages) {
              contentFits = false;
              break;
            }

            doc.font(`${fontFamily}-Bold`).fontSize(fontSize);
            doc.text(project.name || '', { align: 'left' });

            if (project.bullets?.length) {
              doc.moveDown(0.5);
              for (const bullet of project.bullets) {
                doc.text(`• ${bullet}`, { indent: 15, align: 'left' });
              }
            }
            doc.moveDown(1);
          }
        }
      }

      // Add skills
      if (resumeContent.skills?.length) {
        if (doc.bufferedPageRange().count <= maxPages) {
          doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 2);
          doc.text('SKILLS', { align: 'left' });
          doc.moveDown(0.5);

          doc.font(fontFamily).fontSize(fontSize);
          doc.text(resumeContent.skills.join(', '), { align: 'left' });
          doc.moveDown(1);
        }
      }

      // Add education
      if (resumeContent.education?.length) {
        if (doc.bufferedPageRange().count <= maxPages) {
          doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 2);
          doc.text('EDUCATION', { align: 'left' });
          doc.moveDown(0.5);

          for (const edu of resumeContent.education) {
            if (doc.bufferedPageRange().count > maxPages) {
              contentFits = false;
              break;
            }

            doc.font(`${fontFamily}-Bold`).fontSize(fontSize);
            doc.text(edu.school || '', { continued: true });
            doc.font(fontFamily).fontSize(fontSize);
            doc.text(` - ${edu.degree || ''} (${edu.year || ''})`, { align: 'left' });
            doc.moveDown(0.5);
          }
        }
      }

      // If content didn't fit, add a note
      if (!contentFits) {
        doc.font(fontFamily).fontSize(8);
        doc.text('Note: Some content was truncated to fit page limit.', {
          align: 'center',
          color: 'gray'
        });
      }

      // Add page numbers
      const pages = doc.bufferedPageRange().count;
      for (let i = 0; i < pages; i++) {
        doc.switchToPage(i);
        
        // Add page number at bottom
        doc.font(fontFamily).fontSize(8);
        doc.text(
          `Page ${i + 1} of ${pages}`,
          50,
          doc.page.height - 50,
          {
            align: 'center',
            width: doc.page.width - 100
          }
        );
      }

      // Finalize the PDF
      doc.end();
    } catch (error) {
      logger.error('Error generating PDF', { error });
      reject(error);
    }
  });
}

/**
 * Clean up old files in the output directory
 */
function cleanupOldFiles(directory: string, keepCount: number) {
  try {
    const files = fs.readdirSync(directory)
      .map(file => ({
        name: file,
        path: path.join(directory, file),
        mtime: fs.statSync(path.join(directory, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Delete files beyond the keep count
    files.slice(keepCount).forEach(file => {
      try {
        fs.unlinkSync(file.path);
        logger.info('Cleaned up old file', { file: file.name });
      } catch (e) {
        logger.warn('Failed to delete old file', { file: file.name, error: e });
      }
    });
  } catch (error) {
    logger.error('Error cleaning up old files', { error });
  }
}