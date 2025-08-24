const fs = require('fs');
const path = require('path');
const https = require('https');

// Font URLs
const fonts = [
  {
    name: 'Inter-Regular.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.woff2'
  },
  {
    name: 'Inter-Bold.ttf',
    url: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.woff2'
  }
];

// Destination directory
const fontsDir = path.join(__dirname, '../lib/pdf/fonts');

// Ensure directory exists
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Download each font
fonts.forEach(font => {
  const filePath = path.join(fontsDir, font.name);
  console.log(`Downloading ${font.name}...`);
  
  const file = fs.createWriteStream(filePath);
  
  https.get(font.url, response => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${font.name}`);
    });
  }).on('error', err => {
    fs.unlink(filePath);
    console.error(`Error downloading ${font.name}:`, err.message);
  });
});

console.log('Font download initiated. Please wait for completion...');
