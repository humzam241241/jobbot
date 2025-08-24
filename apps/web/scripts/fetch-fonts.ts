import fs from 'fs';
import path from 'path';

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts');

// Ensure fonts directory exists
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Create README with download links
const README_CONTENT = `# Font Downloads

This directory should contain the following open-source fonts:

## Inter
- [Inter-Regular.ttf](https://github.com/rsms/inter/releases/download/v3.19/Inter-3.19.zip)
- [Inter-SemiBold.ttf](https://github.com/rsms/inter/releases/download/v3.19/Inter-3.19.zip)

## Roboto
- [Roboto-Regular.ttf](https://github.com/googlefonts/roboto/releases/download/v2.138/roboto-unhinted.zip)
- [Roboto-Bold.ttf](https://github.com/googlefonts/roboto/releases/download/v2.138/roboto-unhinted.zip)

## Open Sans
- [OpenSans-Regular.ttf](https://fonts.google.com/download?family=Open%20Sans)
- [OpenSans-SemiBold.ttf](https://fonts.google.com/download?family=Open%20Sans)

## Lato
- [Lato-Regular.ttf](https://fonts.google.com/download?family=Lato)
- [Lato-Bold.ttf](https://fonts.google.com/download?family=Lato)

## Carlito (Calibri substitute)
- [Carlito-Regular.ttf](https://github.com/googlefonts/carlito/raw/main/fonts/ttf/Carlito-Regular.ttf)
- [Carlito-Bold.ttf](https://github.com/googlefonts/carlito/raw/main/fonts/ttf/Carlito-Bold.ttf)

## Caladea (Cambria substitute)
- [Caladea-Regular.ttf](https://github.com/googlefonts/caladea/raw/main/fonts/ttf/Caladea-Regular.ttf)
- [Caladea-Bold.ttf](https://github.com/googlefonts/caladea/raw/main/fonts/ttf/Caladea-Bold.ttf)

## Liberation Sans (Arial/Helvetica substitute)
- [LiberationSans-Regular.ttf](https://github.com/liberationfonts/liberation-fonts/releases/download/2.1.5/liberation-fonts-ttf-2.1.5.tar.gz)
- [LiberationSans-Bold.ttf](https://github.com/liberationfonts/liberation-fonts/releases/download/2.1.5/liberation-fonts-ttf-2.1.5.tar.gz)

## Liberation Serif (Times New Roman substitute)
- [LiberationSerif-Regular.ttf](https://github.com/liberationfonts/liberation-fonts/releases/download/2.1.5/liberation-fonts-ttf-2.1.5.tar.gz)
- [LiberationSerif-Bold.ttf](https://github.com/liberationfonts/liberation-fonts/releases/download/2.1.5/liberation-fonts-ttf-2.1.5.tar.gz)

Please download these fonts and place them in this directory.

Note: Do not commit proprietary fonts. This repository only includes open-source fonts.
`;

fs.writeFileSync(path.join(FONTS_DIR, 'README-FONTS.md'), README_CONTENT);
console.log('Created README-FONTS.md with download links');
