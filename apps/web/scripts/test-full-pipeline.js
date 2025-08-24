const fs = require('fs');
const path = require('path');

// Set up environment for testing
process.env.NODE_ENV = 'development';

async function testFullPipeline() {
  console.log('Testing full resume generation pipeline...');
  
  try {
    // Create test directories
    const testDir = path.join(process.cwd(), 'test');
    const outputDir = path.join(testDir, 'output');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create or use a sample PDF
    let testPdfPath = path.join(testDir, 'sample-resume.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('No sample PDF found. Please place a sample resume PDF at:', testPdfPath);
      console.log('Exiting test...');
      return;
    }
    
    console.log('Using sample PDF:', testPdfPath);
    const resumeBuffer = fs.readFileSync(testPdfPath);
    
    // Sample job description
    const jobDescription = `
    Software Engineer
    
    About the Role:
    We are seeking a skilled Software Engineer to join our development team. The ideal candidate will have strong experience in building web applications using modern technologies.
    
    Responsibilities:
    - Design, develop, and maintain web applications
    - Write clean, efficient, and well-documented code
    - Collaborate with cross-functional teams
    - Troubleshoot and debug applications
    - Implement security and data protection measures
    
    Requirements:
    - Bachelor's degree in Computer Science or related field
    - 3+ years of experience in software development
    - Proficiency in JavaScript, TypeScript, and React
    - Experience with Node.js and RESTful APIs
    - Familiarity with database technologies (SQL, NoSQL)
    - Knowledge of cloud services (AWS, Azure, or GCP)
    - Strong problem-solving skills and attention to detail
    `;
    
    // Import the pipeline
    console.log('Importing pipeline module...');
    const { generateResumeKit } = require('../lib/pdf/api/pipeline');
    
    // Run the pipeline
    console.log('Running pipeline...');
    const result = await generateResumeKit(
      resumeBuffer,
      jobDescription,
      outputDir,
      {
        debug: true
      }
    );
    
    console.log('Pipeline completed successfully!');
    console.log('Results:');
    console.log('- Tailored Resume PDF Size:', result.tailoredResumePdf.length);
    console.log('- Cover Letter HTML Size:', result.coverLetterHtml.length);
    console.log('- ATS Report HTML Size:', result.atsReportHtml.length);
    
    console.log('Output files:');
    const outputFiles = fs.readdirSync(outputDir);
    outputFiles.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${stats.size} bytes)`);
    });
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing pipeline:', error);
  }
}

testFullPipeline();
