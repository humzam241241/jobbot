const fs = require('fs');
const path = require('path');
const { generateCoverLetter } = require('../lib/cover-letter/generate');
const { createAtsReport } = require('../lib/pipeline/atsReport');

async function testPipeline() {
  console.log('Testing resume generation pipeline...');
  
  try {
    // Test cover letter generation
    console.log('Testing cover letter generation...');
    const coverLetterContent = `
    Dear Hiring Manager,

    I am writing to express my interest in the Software Engineer position at your company. With my strong background in web development and experience with React, Node.js, and TypeScript, I believe I would be a valuable addition to your team.

    Throughout my career, I have developed scalable web applications, implemented responsive designs, and optimized performance. I am particularly proud of reducing load times by 40% through code splitting and lazy loading techniques.

    I am excited about the opportunity to contribute to your innovative projects and grow professionally in a collaborative environment. Your company's commitment to cutting-edge technology and user-centric design aligns perfectly with my own values and career goals.

    Thank you for considering my application. I look forward to the possibility of discussing how my skills and experience can benefit your team.

    Sincerely,
    John Doe
    `;
    
    const { buffer, filePath } = await generateCoverLetter(coverLetterContent);
    console.log('Cover letter generated successfully:', filePath);
    
    // Test ATS report generation
    console.log('Testing ATS report generation...');
    const resumeText = "Experienced software engineer with skills in React, Node.js, and TypeScript";
    const jobDescription = "Looking for a software engineer with React, Node.js, and AWS experience";
    
    const kitId = `test_${Date.now()}`;
    const kitDir = path.join(process.cwd(), 'public/kits', kitId);
    
    // Create kit directory if it doesn't exist
    if (!fs.existsSync(kitDir)) {
      fs.mkdirSync(kitDir, { recursive: true });
    }
    
    const atsReport = await createAtsReport({
      resumeText,
      jdText: jobDescription,
      kitId
    });
    
    console.log('ATS report generated successfully:', atsReport);
    
    console.log('Pipeline test completed successfully!');
  } catch (error) {
    console.error('Error testing pipeline:', error);
  }
}

testPipeline();
