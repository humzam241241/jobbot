const fs = require('fs');
const path = require('path');

// Set up environment for testing
process.env.DEBUG_RENDER = '1';
process.env.NODE_ENV = 'development';

// Import the extract module directly using require
async function runTest() {
  try {
    console.log('Starting PDF extraction test');
    
    // Create test directory if it doesn't exist
    const testDir = path.join(__dirname, '../test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create a simple PDF file for testing if it doesn't exist
    const testPdfPath = path.join(testDir, 'test.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('Creating test PDF file');
      // This is just a placeholder - in reality we'd create a real PDF
      fs.writeFileSync(testPdfPath, 'PDF placeholder');
    }
    
    // Dynamically import our modules
    console.log('Importing PDF modules');
    
    // Need to use TypeScript require for .ts files
    try {
      const { register } = require('ts-node');
      register({
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
        }
      });
      
      // Read the test PDF
      console.log('Reading test PDF file');
      const pdfBytes = fs.readFileSync(testPdfPath);
      
      try {
        const extractModule = require('../lib/pdf/analyzer/extract');
        console.log('Successfully imported extract module');
        
        // Test the extraction function
        console.log('Testing extractTextItems function');
        try {
          const textItems = await extractModule.extractTextItems(pdfBytes);
          console.log('Extraction successful:', { itemCount: textItems.length });
        } catch (extractError) {
          console.error('Error during extraction:', extractError);
        }
      } catch (importError) {
        console.error('Error importing extract module:', importError);
        console.log('Trying alternative import approach...');
        
        // Try an alternative approach
        const extractPath = path.join(__dirname, '../lib/pdf/analyzer/extract.ts');
        if (fs.existsSync(extractPath)) {
          console.log('Extract file exists at:', extractPath);
          console.log('File content sample:', fs.readFileSync(extractPath, 'utf8').slice(0, 200));
        } else {
          console.error('Extract file does not exist at:', extractPath);
        }
      }
    } catch (tsNodeError) {
      console.error('Error setting up ts-node:', tsNodeError);
    }
    
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();