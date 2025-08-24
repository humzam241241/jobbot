import path from 'path';
import fs from 'fs';
import { analyzePdfToManifest } from '../lib/style/pdf-style-analyzer';
import { renderWithStylePreserve } from '../lib/generation/style-preserve';

/**
 * This script tests the style preservation functionality by:
 * 1. Taking a sample PDF resume
 * 2. Analyzing its style
 * 3. Generating a new resume, cover letter, and ATS report with preserved styling
 */
async function testStylePreservation() {
  try {
    console.log('Starting style preservation test...');
    
    // Path to sample resume
    const samplePdfPath = path.join(process.cwd(), 'test', 'sample-resume.pdf');
    
    // Check if sample file exists
    if (!fs.existsSync(samplePdfPath)) {
      console.error('Sample resume not found at:', samplePdfPath);
      console.log('Please place a sample PDF resume at this location.');
      return;
    }
    
    console.log('Sample resume found. Analyzing style...');
    
    // Generate a test kit ID
    const kitId = `test-kit-${Date.now()}`;
    
    // Sample data
    const mockProfile = {
      header: {
        fullName: 'John Doe',
        contacts: ['john.doe@example.com', '(123) 456-7890', 'New York, NY'],
        email: 'john.doe@example.com',
        phone: '(123) 456-7890',
        location: 'New York, NY'
      },
      summary: 'Experienced software engineer with expertise in web development, cloud computing, and machine learning.',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'Python'],
      experience: [
        {
          company: 'Tech Company',
          title: 'Senior Software Engineer',
          location: 'New York, NY',
          startDate: 'Jan 2020',
          endDate: 'Present',
          bullets: [
            'Led development of a high-performance web application serving 1M+ users',
            'Improved application performance by 40% through code optimization',
            'Mentored junior developers and conducted code reviews'
          ]
        }
      ],
      education: [
        {
          school: 'University of Technology',
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          startDate: '2015',
          endDate: '2019',
          gpa: '3.8'
        }
      ]
    };
    
    const mockJobDescription = `
      Senior Software Engineer
      
      Company: Innovative Tech Solutions
      
      Job Description:
      We are looking for a Senior Software Engineer to join our team. The ideal candidate will have experience with JavaScript, TypeScript, React, and Node.js. Knowledge of AWS and Python is a plus.
      
      Responsibilities:
      - Develop high-quality web applications
      - Optimize application performance
      - Mentor junior developers
      - Conduct code reviews
      
      Requirements:
      - 3+ years of experience with JavaScript and TypeScript
      - Experience with React and Node.js
      - Knowledge of AWS
      - Strong problem-solving skills
    `;
    
    const mockAtsData = {
      matchPercent: 85,
      keywordsCovered: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'Python'],
      keywordsMissing: ['Docker', 'Kubernetes', 'GraphQL'],
      warnings: ['Consider adding more specific achievements'],
      recommendations: ['Add more quantifiable results', 'Include more technical keywords']
    };
    
    // Render with style preservation
    console.log('Rendering with style preservation...');
    const result = await renderWithStylePreserve(
      kitId,
      samplePdfPath,
      mockProfile,
      mockJobDescription,
      mockAtsData
    );
    
    console.log('Style preservation test completed successfully!');
    console.log('Generated files:');
    console.log('- Resume:', result.resumeUrl);
    console.log('- Cover Letter:', result.coverLetterUrl);
    console.log('- ATS Report:', result.atsReportUrl);
    console.log('Files are available in the public/kits directory.');
    
  } catch (error) {
    console.error('Error during style preservation test:', error);
  }
}

// Run the test
testStylePreservation();
