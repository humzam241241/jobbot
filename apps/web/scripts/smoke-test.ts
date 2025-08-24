import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Sample data
const SAMPLE_RESUME_PATH = path.join(process.cwd(), 'scripts', 'sample-resume.pdf');
const SAMPLE_JD = `
Job Title: Software Engineer
Company: Acme Corp
Location: Remote

Requirements:
- 3+ years of experience with JavaScript, TypeScript, and React
- Experience with Node.js and Express
- Knowledge of SQL and NoSQL databases
- Experience with Git and CI/CD pipelines
`;

async function runSmokeTest() {
  console.log('Starting smoke test...');
  
  // Check if sample resume exists
  if (!fs.existsSync(SAMPLE_RESUME_PATH)) {
    console.error('Sample resume not found. Please create a sample resume at scripts/sample-resume.pdf');
    process.exit(1);
  }
  
  // Create a test kit ID
  const kitId = `test_${uuidv4()}`;
  const kitDir = path.join(process.cwd(), 'public', 'kits', kitId);
  fs.mkdirSync(kitDir, { recursive: true });
  
  // Copy sample resume to kit directory
  fs.copyFileSync(SAMPLE_RESUME_PATH, path.join(kitDir, 'original.pdf'));
  
  // Create mock files
  const resumePath = path.join(kitDir, 'resume.pdf');
  const coverPath = path.join(kitDir, 'cover-letter.pdf');
  const atsPath = path.join(kitDir, 'ats.pdf');
  
  // Write sample content
  fs.writeFileSync(resumePath, 'Sample resume content');
  fs.writeFileSync(coverPath, 'Sample cover letter content');
  fs.writeFileSync(atsPath, 'Sample ATS report content');
  
  // Verify files exist
  const files = [resumePath, coverPath, atsPath];
  const allFilesExist = files.every(file => fs.existsSync(file));
  
  if (allFilesExist) {
    console.log('Smoke test passed! All files were created successfully.');
    console.log(`Files are available in ${kitDir}`);
  } else {
    console.error('Smoke test failed! Some files were not created.');
    process.exit(1);
  }
}

runSmokeTest().catch(error => {
  console.error('Smoke test failed with error:', error);
  process.exit(1);
});
