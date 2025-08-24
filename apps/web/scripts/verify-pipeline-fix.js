const fs = require('fs');
const path = require('path');

// Mock LLM module
const mockLlm = {
  complete: async ({ system, user, model }) => {
    console.log(`Mock LLM called with model: ${model}`);
    console.log(`System prompt length: ${system.length}`);
    console.log(`User prompt length: ${user.length}`);
    
    if (user.includes('JOB DESCRIPTION') && system.includes('tailor')) {
      return 'Mock tailored resume content';
    } else if (user.includes('JOB DESCRIPTION') && system.includes('cover letter')) {
      return 'Mock cover letter content';
    } else {
      return 'Mock response';
    }
  }
};

// Mock PDF extraction
const mockPdfExtract = {
  extractTextFromPdf: async (buffer) => {
    console.log('Mock PDF extraction called with buffer length:', buffer.length);
    return {
      pages: 1,
      text: 'Mock PDF text extraction result'
    };
  }
};

// Test the pipeline
async function testPipeline() {
  console.log('Testing resume generation pipeline...');
  
  try {
    // Create test directories
    const publicDir = path.join(process.cwd(), 'public');
    const kitsDir = path.join(publicDir, 'kits');
    
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    if (!fs.existsSync(kitsDir)) {
      fs.mkdirSync(kitsDir, { recursive: true });
    }
    
    // Create a test kit directory
    const kitId = `test_${Date.now()}`;
    const kitDir = path.join(kitsDir, kitId);
    
    if (!fs.existsSync(kitDir)) {
      fs.mkdirSync(kitDir, { recursive: true });
    }
    
    console.log('Created test kit directory:', kitDir);
    
    // Test PDF extraction
    console.log('\nTesting PDF extraction...');
    const mockPdfBuffer = Buffer.from('Mock PDF content');
    const extractResult = await mockPdfExtract.extractTextFromPdf(mockPdfBuffer);
    console.log('PDF extraction result:', extractResult);
    
    // Test LLM for tailored resume
    console.log('\nTesting LLM for tailored resume...');
    const tailoredResumeResponse = await mockLlm.complete({
      system: 'You are an expert resume writer',
      user: 'JOB DESCRIPTION: Test job\n\nRESUME: Test resume',
      model: 'auto'
    });
    console.log('Tailored resume response:', tailoredResumeResponse);
    
    // Test LLM for cover letter
    console.log('\nTesting LLM for cover letter...');
    const coverLetterResponse = await mockLlm.complete({
      system: 'You are a professional cover letter writer',
      user: 'JOB DESCRIPTION: Test job\n\nRESUME: Test resume',
      model: 'auto'
    });
    console.log('Cover letter response:', coverLetterResponse);
    
    // Create test files
    console.log('\nCreating test files...');
    
    // Original PDF
    const originalPdfPath = path.join(kitDir, 'original.pdf');
    fs.writeFileSync(originalPdfPath, mockPdfBuffer);
    console.log('Created original PDF:', originalPdfPath);
    
    // Tailored resume
    const tailoredResumePath = path.join(kitDir, 'tailored.html');
    fs.writeFileSync(tailoredResumePath, `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tailored Resume</title>
      </head>
      <body>
        <h1>Tailored Resume</h1>
        <div>${tailoredResumeResponse}</div>
      </body>
      </html>
    `);
    console.log('Created tailored resume:', tailoredResumePath);
    
    // Cover letter
    const coverLetterPath = path.join(kitDir, 'cover.html');
    fs.writeFileSync(coverLetterPath, `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cover Letter</title>
      </head>
      <body>
        <h1>Cover Letter</h1>
        <div>${coverLetterResponse}</div>
      </body>
      </html>
    `);
    console.log('Created cover letter:', coverLetterPath);
    
    // ATS report
    const atsReportPath = path.join(kitDir, 'ats.html');
    fs.writeFileSync(atsReportPath, `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ATS Report</title>
      </head>
      <body>
        <h1>ATS Report</h1>
        <div>Mock ATS report content</div>
      </body>
      </html>
    `);
    console.log('Created ATS report:', atsReportPath);
    
    console.log('\nTest completed successfully!');
    console.log('Test kit ID:', kitId);
    console.log('Test kit directory:', kitDir);
  } catch (error) {
    console.error('Error testing pipeline:', error);
  }
}

testPipeline();
