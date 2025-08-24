const fs = require('fs');
const path = require('path');

// Create test directories
const testDir = path.join(__dirname, '../test');
const fontsDir = path.join(__dirname, '../lib/pdf/fonts');

// Ensure directories exist
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Create a simple font file if it doesn't exist (just a placeholder)
const regularFontPath = path.join(fontsDir, 'Inter-Regular.ttf');
const boldFontPath = path.join(fontsDir, 'Inter-Bold.ttf');

if (!fs.existsSync(regularFontPath)) {
  console.log('Creating placeholder font file (Inter-Regular.ttf)');
  fs.writeFileSync(regularFontPath, 'Placeholder font file');
}

if (!fs.existsSync(boldFontPath)) {
  console.log('Creating placeholder font file (Inter-Bold.ttf)');
  fs.writeFileSync(boldFontPath, 'Placeholder font file');
}

console.log('Test setup completed. Font placeholders created.');
console.log('NOTE: For actual PDF processing, download real font files from:');
console.log('https://github.com/rsms/inter/tree/master/docs/font-files');
console.log('\nPlaceholder fonts have been created at:');
console.log(regularFontPath);
console.log(boldFontPath);
