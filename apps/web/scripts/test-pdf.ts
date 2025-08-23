import fs from 'fs';
import path from 'path';
import { extractTextFromNodePdf } from '../lib/pdf/node-pdf-parser';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-test');

async function testPdfParser() {
  try {
    // Create a test directory if it doesn't exist
    const testDir = path.join(process.cwd(), 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Test with sample PDFs from different locations
    const testFiles = [
      path.join(process.cwd(), 'public', 'test-resume.pdf'),
      path.join(testDir, 'sample-resume.pdf'),
      // Add more test files here
    ];

    for (const filePath of testFiles) {
      if (fs.existsSync(filePath)) {
        logger.info(`Testing PDF parser with ${path.basename(filePath)}`);
        
        const pdfBuffer = fs.readFileSync(filePath);
        const extractedText = await extractTextFromNodePdf(pdfBuffer);
        
        logger.info('Successfully extracted text', {
          fileName: path.basename(filePath),
          textLength: extractedText.length,
          preview: extractedText.substring(0, 200) + '...'
        });
        
        // Write extracted text to file for verification
        const outputPath = path.join(testDir, `${path.basename(filePath, '.pdf')}-extracted.txt`);
        fs.writeFileSync(outputPath, extractedText);
        logger.info(`Extracted text written to ${outputPath}`);
      } else {
        logger.warn(`Test file not found: ${filePath}`);
      }
    }
    
    logger.info('PDF parser tests completed successfully');
  } catch (error) {
    logger.error('Error testing PDF parser', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run the tests
testPdfParser();
