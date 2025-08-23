import { createLogger } from '@/lib/logger';
import { generatePdf } from '../pdf/generate';

const logger = createLogger('cover-letter-generator');

interface CoverLetterContent {
  introduction?: string;
  body?: string[];
  closing?: string;
  signature?: string;
}

/**
 * Generates a cover letter PDF
 */
export async function generateCoverLetter(content: string): Promise<{ buffer: Buffer; filePath: string }> {
  try {
    // Parse JSON content
    let coverLetterContent: CoverLetterContent;
    try {
      coverLetterContent = JSON.parse(content);
    } catch (e) {
      logger.warn('Failed to parse JSON, treating as plain text', { error: e });
      coverLetterContent = { body: [content] };
    }

    // Format content for PDF
    const formattedContent = formatCoverLetter(coverLetterContent);

    // Generate PDF
    return await generatePdf({
      content: formattedContent,
      title: 'Cover Letter',
      maxPages: 1,
      fontSize: 11
    });
  } catch (error) {
    logger.error('Error generating cover letter', { error });
    throw error;
  }
}

/**
 * Formats cover letter content for PDF generation
 */
function formatCoverLetter(content: CoverLetterContent): string {
  const parts: string[] = [];

  // Add introduction
  if (content.introduction) {
    parts.push(content.introduction);
    parts.push('');
  }

  // Add body paragraphs
  if (content.body?.length) {
    parts.push(...content.body);
    parts.push('');
  }

  // Add closing
  if (content.closing) {
    parts.push(content.closing);
    parts.push('');
  }

  // Add signature
  if (content.signature) {
    parts.push(content.signature);
  }

  return parts.join('\n');
}
