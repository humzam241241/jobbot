const fs = require('fs');
const path = require('path');
const { extractTextFromPdf } = require('../lib/pdf/extract');

async function testPipeline() {
  console.log('Testing updated pipeline...');
  
  try {
    // Create test PDF if it doesn't exist
    const testDir = path.join(process.cwd(), 'test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Use an existing PDF or create a placeholder
    let testPdfPath = path.join(testDir, 'sample-resume.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('No sample PDF found, using a placeholder');
      // This is just a placeholder - in a real scenario, you'd use a real PDF
      fs.writeFileSync(testPdfPath, 'PDF placeholder');
    }
    
    // Test PDF text extraction
    console.log('Testing PDF text extraction...');
    try {
      const pdfBuffer = fs.readFileSync(testPdfPath);
      const extractResult = await extractTextFromPdf(pdfBuffer);
      console.log('PDF text extracted:', {
        pages: extractResult.pages,
        textLength: extractResult.text.length,
        textSample: extractResult.text.slice(0, 100) + '...'
      });
    } catch (extractError) {
      console.error('Error extracting PDF text:', extractError);
    }
    
    // Test ATS scoring
    console.log('Testing ATS scoring...');
    try {
      const { scoreAts } = require('../lib/pipeline/ats/score');
      const resumeText = 'Software engineer with experience in JavaScript, React, Node.js, TypeScript, and AWS. Developed scalable web applications and RESTful APIs. Implemented CI/CD pipelines and automated testing.';
      const jobDescription = 'Looking for a software engineer with React, Node.js, and AWS experience. Must have experience with TypeScript and RESTful APIs.';
      
      const atsScore = scoreAts(resumeText, jobDescription);
      console.log('ATS score:', {
        matchPercent: atsScore.matchPercent,
        keywordsCovered: atsScore.keywordsCovered,
        keywordsMissing: atsScore.keywordsMissing,
        warnings: atsScore.warnings,
        recommendations: atsScore.recommendations
      });
    } catch (scoreError) {
      console.error('Error testing ATS scoring:', scoreError);
    }
    
    console.log('Pipeline test completed!');
  } catch (error) {
    console.error('Error testing pipeline:', error);
  }
}

testPipeline();
