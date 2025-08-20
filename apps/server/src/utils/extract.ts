import fs from 'fs';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export async function extractTextFromFile(filePath: string, mime: string): Promise<string> {
  const lower = mime.toLowerCase();
  if (lower.includes('word') || filePath.endsWith('.docx')) {
    const buffer = fs.readFileSync(filePath);
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } else if (lower.includes('pdf') || filePath.endsWith('.pdf')) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (lower.includes('text') || filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    // Fallback: try reading as UTF-8
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }
}
