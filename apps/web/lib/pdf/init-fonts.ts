import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pdf-fonts');

/**
 * Ensures that font files exist in the fonts directory
 * If they don't exist, creates placeholder files
 */
export function ensureFontsExist(): void {
  try {
    const fontDir = path.join(process.cwd(), 'apps/web/lib/pdf/fonts');
    
    // Create font directory if it doesn't exist
    if (!fs.existsSync(fontDir)) {
      logger.info('Creating font directory');
      fs.mkdirSync(fontDir, { recursive: true });
    }
    
    // Check and create regular font
    const regularFontPath = path.join(fontDir, 'Inter-Regular.ttf');
    if (!fs.existsSync(regularFontPath)) {
      logger.info('Creating placeholder regular font');
      fs.writeFileSync(regularFontPath, 'Placeholder font file');
    }
    
    // Check and create bold font
    const boldFontPath = path.join(fontDir, 'Inter-Bold.ttf');
    if (!fs.existsSync(boldFontPath)) {
      logger.info('Creating placeholder bold font');
      fs.writeFileSync(boldFontPath, 'Placeholder font file');
    }
    
    logger.info('Font files verified');
  } catch (error) {
    logger.error('Error ensuring fonts exist', { error });
  }
}

// Run automatically in development
if (process.env.NODE_ENV === 'development') {
  ensureFontsExist();
}
