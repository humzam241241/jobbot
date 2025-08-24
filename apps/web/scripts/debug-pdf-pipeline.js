const fs = require('fs');
const path = require('path');

// Set environment variables for debugging
process.env.DEBUG_RENDER = '1';

// Create a simple debug function
function debug(message, data) {
  console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Check if PDF.js can be imported
debug('Testing PDF.js import');
try {
  // Try dynamic import
  (async () => {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
      debug('PDF.js imported successfully', { version: pdfjs.version });
      
      // Configure worker
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
        pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
        debug('Worker configured', { workerPath });
      }
    } catch (error) {
      debug('Error importing PDF.js dynamically', { error: error.message, stack: error.stack });
    }
  })();
} catch (error) {
  debug('Error in PDF.js import test', { error: error.message, stack: error.stack });
}

// Check font directories
const fontsDir = path.join(__dirname, '../lib/pdf/fonts');
debug('Checking fonts directory', { fontsDir });

if (!fs.existsSync(fontsDir)) {
  debug('Fonts directory does not exist, creating it');
  fs.mkdirSync(fontsDir, { recursive: true });
}

// List files in fonts directory
const fontFiles = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : [];
debug('Font files', { fontFiles });

// Create placeholder fonts if needed
const regularFontPath = path.join(fontsDir, 'Inter-Regular.ttf');
const boldFontPath = path.join(fontsDir, 'Inter-Bold.ttf');

if (!fs.existsSync(regularFontPath)) {
  debug('Creating placeholder font file (Inter-Regular.ttf)');
  fs.writeFileSync(regularFontPath, 'Placeholder font file');
}

if (!fs.existsSync(boldFontPath)) {
  debug('Creating placeholder font file (Inter-Bold.ttf)');
  fs.writeFileSync(boldFontPath, 'Placeholder font file');
}

debug('Font files after creation', { 
  regularExists: fs.existsSync(regularFontPath),
  boldExists: fs.existsSync(boldFontPath)
});

// Check directories
const dirs = [
  path.join(__dirname, '../lib/pdf/analyzer'),
  path.join(__dirname, '../lib/pdf/renderer'),
  path.join(__dirname, '../lib/pdf/normalize'),
  path.join(__dirname, '../lib/pdf/debug')
];

dirs.forEach(dir => {
  debug(`Checking directory: ${dir}`, { exists: fs.existsSync(dir) });
  if (fs.existsSync(dir)) {
    debug(`Files in ${dir}`, fs.readdirSync(dir));
  }
});

debug('Debug script completed');
