import { extractPdfText, isLikelyScannedPdf } from '../extract/extract-pdf';
import { performOcr } from '../extract/ocr-fallback';
import { extractResumeFacts } from '../extract/to-facts';
import { tailorResume } from '../tailor/llm-tailor';
import { scoreResume } from '../score/ats-scorer';
import { renderTailoredResume } from '../render/resume-renderer';
import { generateCoverLetterFromResume, generateCoverLetterHtml, saveCoverLetterHtml } from '../render/cover-letter';
import { generateAtsReportFromResume, generateAtsReportHtml, saveAtsReportHtml } from '../render/ats-report';
import { ensureFontsExist } from '../init-fonts';
import { createLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const logger = createLogger('resume-pipeline');

export interface ResumeKitOptions {
  provider?: string;
  model?: string;
  debug?: boolean;
}

export interface ResumeKitResult {
  tailoredResumePdf: Buffer;
  coverLetterHtml: string;
  atsReportHtml: string;
  originalText?: string;
  tailoredText?: string;
}

/**
 * Main pipeline for generating a resume kit
 * This orchestrates the entire process from PDF extraction to rendering
 */
export async function generateResumeKit(
  resumePdfBuffer: Buffer,
  jobDescription: string,
  outputDir: string,
  options: ResumeKitOptions = {}
): Promise<ResumeKitResult> {
  logger.info('Starting resume kit generation', {
    bufferSize: resumePdfBuffer.length,
    jobDescriptionLength: jobDescription.length,
    provider: options.provider || 'default',
    model: options.model || 'default',
    debug: options.debug || false
  });
  
  try {
    // Ensure font files exist
    ensureFontsExist();
    
    // Step 1: Extract text from PDF
    logger.info('Extracting text from PDF');
    let textBlocks;
    let originalText = '';
    
    try {
      textBlocks = await extractPdfText(resumePdfBuffer);
      
      // Check if it's a scanned PDF
      if (isLikelyScannedPdf(textBlocks)) {
        logger.info('Detected scanned PDF, using OCR');
        textBlocks = await performOcr(resumePdfBuffer);
      }
      
      // Extract original text
      originalText = textBlocks.map(block => block.text).join(' ');
      logger.info('Text extraction complete', { blockCount: textBlocks.length });
    } catch (extractError) {
      logger.error('Error extracting text from PDF', { error: extractError });
      // Provide fallback text blocks
      textBlocks = [{
        text: 'Unable to extract text from this PDF. Using fallback text.',
        x: 50,
        y: 50,
        width: 500,
        height: 20,
        fontSize: 12,
        page: 0
      }];
      originalText = 'Unable to extract text from this PDF. Using fallback text.';
    }
    
    // Step 2: Extract structured facts
    logger.info('Extracting resume facts');
    const resumeFacts = extractResumeFacts(textBlocks);
    logger.info('Resume facts extracted', {
      hasContact: Object.keys(resumeFacts.contact).length > 0,
      skillsCount: resumeFacts.skills.length,
      experienceCount: resumeFacts.experience.length,
      educationCount: resumeFacts.education.length
    });
    
    // Step 3: Tailor resume
    logger.info('Tailoring resume');
    const tailoredResume = await tailorResume(resumeFacts, jobDescription, {
      provider: options.provider,
      model: options.model
    });
    logger.info('Resume tailored successfully');
    
    // Step 4: Score resume
    logger.info('Scoring resume');
    const atsScore = scoreResume(tailoredResume, jobDescription);
    logger.info('Resume scored', { overallScore: atsScore.overall });
    
    // Step 5: Generate cover letter
    logger.info('Generating cover letter');
    const coverLetter = await generateCoverLetterFromResume(tailoredResume, jobDescription, {
      provider: options.provider,
      model: options.model
    });
    const coverLetterHtml = generateCoverLetterHtml(coverLetter);
    logger.info('Cover letter generated');
    
    // Step 6: Generate ATS report
    logger.info('Generating ATS report');
    const atsReport = await generateAtsReportFromResume(tailoredResume, jobDescription, {
      provider: options.provider,
      model: options.model
    });
    const atsReportHtml = generateAtsReportHtml(atsReport);
    logger.info('ATS report generated');
    
    // Step 7: Render tailored resume
    logger.info('Rendering tailored resume');
    let tailoredResumePdf;
    
    try {
      tailoredResumePdf = await renderTailoredResume(
        resumePdfBuffer,
        tailoredResume,
        textBlocks,
        options.debug
      );
      logger.info('Tailored resume rendered successfully');
    } catch (renderError) {
      logger.error('Error rendering tailored resume, using original PDF', { error: renderError });
      tailoredResumePdf = resumePdfBuffer;
    }
    
    // Step 8: Save artifacts
    logger.info('Saving artifacts', { outputDir });
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save tailored resume
    fs.writeFileSync(path.join(outputDir, 'tailored.pdf'), tailoredResumePdf);
    
    // Save cover letter
    saveCoverLetterHtml(coverLetterHtml, path.join(outputDir, 'cover.html'));
    
    // Save ATS report
    saveAtsReportHtml(atsReportHtml, path.join(outputDir, 'ats.html'));
    
    // Save original resume
    fs.writeFileSync(path.join(outputDir, 'original.pdf'), resumePdfBuffer);
    
    // Save tailored text (for debugging)
    const tailoredText = JSON.stringify(tailoredResume, null, 2);
    fs.writeFileSync(path.join(outputDir, 'tailored.json'), tailoredText);
    
    logger.info('Resume kit generation complete');
    
    return {
      tailoredResumePdf,
      coverLetterHtml,
      atsReportHtml,
      originalText,
      tailoredText
    };
  } catch (error) {
    logger.error('Error generating resume kit', { error });
    throw error;
  }
}