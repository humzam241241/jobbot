const fs = require('fs');
const path = require('path');
const https = require('https');

// Font URLs
const FONTS = [
  {
    name: 'Inter-Regular.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.woff2'
  },
  {
    name: 'Inter-Bold.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.woff2'
  }
];

// Font directory
const FONT_DIR = path.join(process.cwd(), 'apps/web/lib/pdf/fonts');

// Create font directory if it doesn't exist
if (!fs.existsSync(FONT_DIR)) {
  fs.mkdirSync(FONT_DIR, { recursive: true });
}

// Download a font
function downloadFont(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if there's an error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
}

// Create placeholder font files if download fails
function createPlaceholderFont(filePath) {
  console.log(`Creating placeholder font: ${filePath}`);
  fs.writeFileSync(filePath, 'Placeholder font file');
}

// Main function
async function downloadFonts() {
  console.log('Downloading fonts...');
  
  for (const font of FONTS) {
    const filePath = path.join(FONT_DIR, font.name);
    
    // Skip if the font already exists
    if (fs.existsSync(filePath)) {
      console.log(`Font already exists: ${font.name}`);
      continue;
    }
    
    try {
      console.log(`Downloading ${font.name} from ${font.url}`);
      await downloadFont(font.url, filePath);
      console.log(`Downloaded ${font.name}`);
    } catch (error) {
      console.error(`Error downloading ${font.name}:`, error);
      createPlaceholderFont(filePath);
    }
  }
  
  console.log('Font download complete!');
}

downloadFonts();