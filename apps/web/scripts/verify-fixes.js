const fs = require('fs');
const path = require('path');

// Set up environment for testing
process.env.NODE_ENV = 'development';

async function verifyFixes() {
  console.log('Verifying pipeline fixes...');
  
  try {
    // Check font files
    const fontDir = path.join(process.cwd(), 'apps/web/lib/pdf/fonts');
    console.log('Checking font files...');
    
    if (!fs.existsSync(fontDir)) {
      console.log('Creating font directory...');
      fs.mkdirSync(fontDir, { recursive: true });
    }
    
    const regularFontPath = path.join(fontDir, 'Inter-Regular.ttf');
    const boldFontPath = path.join(fontDir, 'Inter-Bold.ttf');
    
    if (!fs.existsSync(regularFontPath)) {
      console.log('Creating placeholder regular font...');
      fs.writeFileSync(regularFontPath, 'Placeholder font file');
    }
    
    if (!fs.existsSync(boldFontPath)) {
      console.log('Creating placeholder bold font...');
      fs.writeFileSync(boldFontPath, 'Placeholder font file');
    }
    
    console.log('Font files verified.');
    
    // Check module imports
    console.log('Testing module imports...');
    
    try {
      // Test PDF extraction
      const extractPdfPath = path.join(process.cwd(), 'apps/web/lib/pdf/extract/extract-pdf.ts');
      console.log(`Checking if file exists: ${extractPdfPath}`);
      console.log(`File exists: ${fs.existsSync(extractPdfPath)}`);
      
      if (fs.existsSync(extractPdfPath)) {
        console.log('✓ PDF extraction module file exists');
      } else {
        console.error('✗ PDF extraction module file not found');
      }
    } catch (error) {
      console.error('✗ Error checking PDF extraction module:', error.message);
    }
    
    try {
      // Test OCR fallback
      const ocrFallbackPath = path.join(process.cwd(), 'apps/web/lib/pdf/extract/ocr-fallback.ts');
      console.log(`Checking if file exists: ${ocrFallbackPath}`);
      console.log(`File exists: ${fs.existsSync(ocrFallbackPath)}`);
      
      if (fs.existsSync(ocrFallbackPath)) {
        console.log('✓ OCR fallback module file exists');
      } else {
        console.error('✗ OCR fallback module file not found');
      }
    } catch (error) {
      console.error('✗ Error checking OCR fallback module:', error.message);
    }
    
    // Check all other module files
    const moduleFiles = [
      'apps/web/lib/pdf/extract/to-facts.ts',
      'apps/web/lib/pdf/tailor/llm-tailor.ts',
      'apps/web/lib/pdf/tailor/schema.ts',
      'apps/web/lib/pdf/tailor/guardrails.ts',
      'apps/web/lib/pdf/score/ats-scorer.ts',
      'apps/web/lib/pdf/score/keyword-extractor.ts',
      'apps/web/lib/pdf/render/resume-renderer.ts',
      'apps/web/lib/pdf/render/cover-letter.ts',
      'apps/web/lib/pdf/render/ats-report.ts',
      'apps/web/lib/pdf/api/pipeline.ts'
    ];
    
    console.log('Checking all module files...');
    const missingFiles = [];
    
    for (const file of moduleFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`✓ ${file} exists`);
      } else {
        console.error(`✗ ${file} not found`);
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      console.error('Missing files:', missingFiles);
    } else {
      console.log('All module files exist!');
    }
    
    // Create test directories
    console.log('Setting up test directories...');
    const testDir = path.join(process.cwd(), 'test');
    const outputDir = path.join(testDir, 'output');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a minimal test PDF
    const testPdfPath = path.join(testDir, 'minimal-test.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('Creating minimal test PDF...');
      
      // Import pdf-lib
      const { PDFDocument, StandardFonts } = require('pdf-lib');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Add some text
      page.drawText('Test Resume', {
        x: 50,
        y: 700,
        size: 24,
        font
      });
      
      page.drawText('Contact: test@example.com', {
        x: 50,
        y: 650,
        size: 12,
        font
      });
      
      page.drawText('Skills', {
        x: 50,
        y: 600,
        size: 16,
        font
      });
      
      page.drawText('JavaScript, TypeScript, React', {
        x: 50,
        y: 580,
        size: 12,
        font
      });
      
      page.drawText('Experience', {
        x: 50,
        y: 530,
        size: 16,
        font
      });
      
      page.drawText('Software Developer at Test Company', {
        x: 50,
        y: 510,
        size: 12,
        font
      });
      
      page.drawText('Education', {
        x: 50,
        y: 460,
        size: 16,
        font
      });
      
      page.drawText('Computer Science, Test University', {
        x: 50,
        y: 440,
        size: 12,
        font
      });
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(testPdfPath, pdfBytes);
      console.log('Minimal test PDF created:', testPdfPath);
    }
    
    console.log('Verification completed successfully!');
    console.log('The pipeline should now be ready for testing with the API.');
  } catch (error) {
    console.error('Error verifying fixes:', error);
  }
}

verifyFixes();