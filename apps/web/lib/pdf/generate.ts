import PDFDocument from 'pdfkit';
import { createLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const logger = createLogger('pdf-generator');

interface PdfGenerateOptions {
  content: string;
  title?: string;
  originalContent?: string; // Original content to help preserve formatting
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Generates a PDF from content with improved formatting
 */
export async function generatePdf(options: PdfGenerateOptions): Promise<Buffer> {
  const {
    content,
    title = 'Generated Document',
    originalContent,
    fontSize = 11,
    fontFamily = 'Helvetica'
  } = options;

  logger.info('Generating PDF', { title });

  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: title,
          Author: 'Resume Generator',
          Subject: 'Generated Resume',
          Keywords: 'resume, job application',
          CreationDate: new Date(),
        }
      });

      // Buffer to store PDF data
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Parse content
      const sections = parseContent(content, originalContent);

      // Add title
      doc.font(`${fontFamily}-Bold`).fontSize(18).text(title, { align: 'center' });
      doc.moveDown(1);

      // Process each section
      sections.forEach((section, index) => {
        // Add section header if it exists
        if (section.header) {
          doc.font(`${fontFamily}-Bold`).fontSize(fontSize + 2);
          doc.text(section.header, { align: 'left' });
          doc.moveDown(0.5);
        }

        // Add section content with proper formatting
        doc.font(fontFamily).fontSize(fontSize);
        
        // Process section content by lines
        section.content.split('\n').forEach(line => {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            doc.moveDown(0.5);
          } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            // Handle bullet points with proper indentation
            doc.text(trimmedLine, { indent: 10 });
          } else if (trimmedLine.startsWith('#') || /^[A-Z\s]+:/.test(trimmedLine)) {
            // Handle subheadings
            doc.font(`${fontFamily}-Bold`).fontSize(fontSize);
            doc.text(trimmedLine.replace(/^#+\s+/, ''));
            doc.font(fontFamily).fontSize(fontSize);
          } else {
            // Regular text
            doc.text(trimmedLine);
          }
        });

        // Add space between sections
        if (index < sections.length - 1) {
          doc.moveDown(1);
        }
      });

      // Add footer with page numbers
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
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
 * Parse content into structured sections for better formatting
 */
function parseContent(content: string, originalContent?: string): Array<{ header?: string; content: string }> {
  // Default structure if we can't parse properly
  if (!content) {
    return [{ content: originalContent || 'No content provided' }];
  }

  // Try to preserve original structure if available
  if (originalContent) {
    // Extract potential section headers from original content
    const originalHeaders = extractSectionHeaders(originalContent);
    
    // If we have original headers, try to maintain that structure
    if (originalHeaders.length > 0) {
      return structureByOriginalHeaders(content, originalHeaders);
    }
  }

  // Otherwise, parse markdown-style sections
  return parseMarkdownSections(content);
}

/**
 * Extract potential section headers from original content
 */
function extractSectionHeaders(text: string): string[] {
  const lines = text.split('\n');
  const headers: string[] = [];
  
  // Look for potential section headers (all caps, short lines)
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 0 && 
      trimmed.length < 30 && 
      trimmed === trimmed.toUpperCase() &&
      !/^\d+$/.test(trimmed) // Not just a number
    ) {
      headers.push(trimmed);
    }
  }
  
  return headers;
}

/**
 * Structure content based on original headers
 */
function structureByOriginalHeaders(content: string, headers: string[]): Array<{ header?: string; content: string }> {
  const sections: Array<{ header?: string; content: string }> = [];
  let currentContent = '';
  
  // Split content into lines
  const lines = content.split('\n');
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this line matches a header pattern
    const isHeader = headers.some(header => 
      trimmed.toUpperCase().includes(header) || 
      header.includes(trimmed.toUpperCase())
    );
    
    if (isHeader && currentContent) {
      // Save previous section
      sections.push({ content: currentContent });
      currentContent = '';
      
      // Add new section with header
      sections.push({ header: trimmed, content: '' });
    } else if (sections.length > 0) {
      // Add to current section
      sections[sections.length - 1].content += line + '\n';
    } else {
      // Add to initial content
      currentContent += line + '\n';
    }
  }
  
  // Add any remaining content
  if (currentContent) {
    sections.push({ content: currentContent });
  }
  
  return sections;
}

/**
 * Parse markdown-style sections from content
 */
function parseMarkdownSections(content: string): Array<{ header?: string; content: string }> {
  const sections: Array<{ header?: string; content: string }> = [];
  const lines = content.split('\n');
  
  let currentHeader: string | undefined;
  let currentContent = '';
  
  for (const line of lines) {
    // Check for markdown headers
    if (line.startsWith('# ')) {
      // Save previous section if it exists
      if (currentContent) {
        sections.push({ header: currentHeader, content: currentContent });
        currentContent = '';
      }
      
      // Start new section
      currentHeader = line.substring(2).trim();
    } else if (line.startsWith('## ')) {
      // Subheader - add as part of content
      currentContent += line.substring(3).trim() + '\n';
    } else {
      // Regular content
      currentContent += line + '\n';
    }
  }
  
  // Add final section
  if (currentContent) {
    sections.push({ header: currentHeader, content: currentContent });
  }
  
  return sections;
}

/**
 * Save PDF to disk and return the file path
 */
export async function savePdfToDisk(pdfBuffer: Buffer, filename: string): Promise<string> {
  const id = uuidv4();
  const outputDir = path.join(process.cwd(), 'public', 'outputs');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, `${id}_${filename}.pdf`);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, pdfBuffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(filePath);
      }
    });
  });
}
