const fs = require('fs');
const path = require('path');

// Function to check if a file exists
function checkFile(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

// Function to check the latest kit
function checkLatestKit() {
  try {
    // Get all kit directories
    const kitsDir = path.join(process.cwd(), 'public/kits');
    if (!fs.existsSync(kitsDir)) {
      console.error('Kits directory not found:', kitsDir);
      return;
    }
    
    // Get all kit directories
    const kitDirs = fs.readdirSync(kitsDir)
      .filter(dir => dir.startsWith('kit_'))
      .map(dir => ({
        id: dir,
        path: path.join(kitsDir, dir),
        mtime: fs.statSync(path.join(kitsDir, dir)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (kitDirs.length === 0) {
      console.log('No kits found');
      return;
    }
    
    // Check the latest kit
    const latestKit = kitDirs[0];
    console.log('Latest kit:', latestKit.id);
    console.log('Created at:', latestKit.mtime);
    
    // Check files
    const originalPdf = path.join(latestKit.path, 'original.pdf');
    const coverLetter = path.join(latestKit.path, 'cover.html');
    const atsReport = path.join(latestKit.path, 'ats.html');
    
    console.log('Original PDF exists:', checkFile(originalPdf));
    console.log('Cover letter exists:', checkFile(coverLetter));
    console.log('ATS report exists:', checkFile(atsReport));
    
    // If files exist, check their sizes
    if (checkFile(originalPdf)) {
      console.log('Original PDF size:', fs.statSync(originalPdf).size);
    }
    
    if (checkFile(coverLetter)) {
      console.log('Cover letter size:', fs.statSync(coverLetter).size);
      // Read a sample of the cover letter
      const coverLetterContent = fs.readFileSync(coverLetter, 'utf8');
      console.log('Cover letter sample:', coverLetterContent.slice(0, 100) + '...');
    }
    
    if (checkFile(atsReport)) {
      console.log('ATS report size:', fs.statSync(atsReport).size);
      // Read a sample of the ATS report
      const atsReportContent = fs.readFileSync(atsReport, 'utf8');
      console.log('ATS report sample:', atsReportContent.slice(0, 100) + '...');
    }
  } catch (error) {
    console.error('Error checking latest kit:', error);
  }
}

// Run the check
checkLatestKit();
