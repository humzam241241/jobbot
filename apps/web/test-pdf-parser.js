// Simple test script for our PDF parser
require('./lib/pdf/browser-polyfill');
const fs = require('fs');
const path = require('path');
const { extractTextFromNodePdf } = require('./lib/pdf/node-pdf-parser');

// Path to a test PDF
const testPdfPath = path.join(__dirname, 'public', 'test-resume.pdf');

// If the test PDF doesn't exist, create a simple one with text
if (!fs.existsSync(testPdfPath)) {
  console.log('Test PDF not found, skipping test');
  process.exit(0);
}

async function testPdfParser() {
  try {
    console.log('Testing PDF parser...');
    const pdfBuffer = fs.readFileSync(testPdfPath);
    
    console.log('Extracting text from PDF...');
    const text = await extractTextFromNodePdf(pdfBuffer);
    
    console.log('Successfully extracted text:');
    console.log('----------------------------');
    console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    console.log('----------------------------');
    console.log(`Total text length: ${text.length} characters`);
    
    console.log('PDF parser test successful!');
  } catch (error) {
    console.error('Error testing PDF parser:', error);
    process.exit(1);
  }
}

testPdfParser();
