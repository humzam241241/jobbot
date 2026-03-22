import { createLogger } from './logger';
import { OpenAI } from 'openai';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import puppeteer from 'puppeteer-core';

const logger = createLogger('resume-processor');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text from a PDF or DOCX file
 */
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Rewrite resume content using OpenAI
 */
async function rewriteContent(resumeText: string, jobDescription: string): Promise<string> {
  const prompt = `
    You are a professional resume writer. Rewrite the following resume to better match the job description.
    Focus on relevant experience and skills, use strong action verbs, and quantify achievements where possible.
    Keep the same basic structure but optimize the content for ATS systems.

    Original Resume:
    ${resumeText}

    Job Description:
    ${jobDescription}

    Rewrite the resume in a clean format, maintaining professional language and focusing on relevant experience.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content || '';
}

/**
 * Create a DOCX document from text content
 */
async function createDocx(content: string, outputPath: string): Promise<void> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: content.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line.trim())],
          spacing: { after: 200 }
        })
      )
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

/**
 * Convert DOCX to PDF using Puppeteer
 */
async function convertToPdf(docxPath: string, pdfPath: string): Promise<void> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Load DOCX content
  const content = fs.readFileSync(docxPath);
  
  // Create a simple HTML viewer
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 1in; }
          p { margin: 0.5em 0; }
        </style>
      </head>
      <body>
        <pre>${content.toString()}</pre>
      </body>
    </html>
  `);
  
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }
  });
  
  await browser.close();
}

/**
 * Process a resume file and return paths to generated files
 */
export async function processResume(
  filePath: string,
  jobDescription: string
): Promise<{ docxPath: string; pdfPath: string }> {
  try {
    logger.info('Starting resume processing', { filePath });

    // Extract text from the original file
    const resumeText = await extractText(filePath);
    logger.info('Text extracted successfully', { length: resumeText.length });

    // Rewrite the content
    const rewrittenContent = await rewriteContent(resumeText, jobDescription);
    logger.info('Content rewritten successfully');

    // Create temporary file paths
    const tempDir = path.join(process.cwd(), 'tmp');
    const docxPath = path.join(tempDir, `resume_${Date.now()}.docx`);
    const pdfPath = path.join(tempDir, `resume_${Date.now()}.pdf`);

    // Generate DOCX
    await createDocx(rewrittenContent, docxPath);
    logger.info('DOCX created successfully', { path: docxPath });

    // Convert to PDF
    await convertToPdf(docxPath, pdfPath);
    logger.info('PDF created successfully', { path: pdfPath });

    return { docxPath, pdfPath };
  } catch (error: any) {
    logger.error('Resume processing failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
