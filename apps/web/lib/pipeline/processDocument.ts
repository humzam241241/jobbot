// apps/web/lib/pipeline/processDocument.ts
import "server-only";
import path from "path";
import fs from "fs/promises";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export interface DocumentMeta {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
}

export interface ProcessedDocument {
  text: string;
  html?: string;
  meta: DocumentMeta;
}

export async function processDocument(filePath: string): Promise<ProcessedDocument> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === ".pdf") {
      return await processPdf(filePath);
    } else if (ext === ".docx") {
      return await processDocx(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Please provide PDF or DOCX.`);
    }
  } catch (error: any) {
    console.error("Error processing document:", error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
}

async function processPdf(filePath: string): Promise<ProcessedDocument> {
  try {
    const data = await pdfParse(await fs.readFile(filePath));
    const text = data.text;
    const meta = extractMeta(text);
    
    return {
      text,
      meta
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file");
  }
}

async function processDocx(filePath: string): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    
    return {
      text: result.value,
      html: htmlResult.value,
      meta: extractMeta(result.value)
    };
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX file");
  }
}

function extractMeta(text: string): DocumentMeta {
  // Extract name (usually first line)
  const lines = text.split("\n").filter(line => line.trim().length > 0);
  const name = lines.length > 0 ? lines[0].trim() : undefined;
  
  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  // Extract phone
  const phoneRegex = /(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/;
  const phoneMatch = text.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  
  // Extract title (often in first few lines)
  const titleRegex = /(Senior|Lead|Principal|Software|Full Stack|Frontend|Backend|DevOps|Engineer|Developer|Architect|Manager|Director|VP|CTO|CEO|Consultant|Designer)/i;
  const titleMatch = text.slice(0, 500).match(titleRegex);
  const title = titleMatch ? titleMatch[0] : undefined;
  
  return { name, email, phone, title };
}