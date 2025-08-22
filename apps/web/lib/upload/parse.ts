// apps/web/lib/upload/parse.ts
import "server-only";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export interface ParsedDocument {
  text: string;
  html?: string;
  meta?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export async function parseUpload(file: File | null): Promise<ParsedDocument> {
  if (!file) {
    throw new Error("No file provided");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tempDir = path.join(os.tmpdir(), "jobbot-uploads");
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempFile = path.join(tempDir, `${uuidv4()}${path.extname(file.name)}`);
  await fs.writeFile(tempFile, buffer);

  try {
    const ext = path.extname(file.name).toLowerCase();
    
    if (ext === ".pdf") {
      return await parsePdf(tempFile);
    } else if (ext === ".docx") {
      return await parseDocx(tempFile);
    } else {
      throw new Error("Unsupported file format. Please upload PDF or DOCX.");
    }
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch (e) {
      console.error("Failed to clean up temp file:", e);
    }
  }
}

async function parsePdf(filePath: string): Promise<ParsedDocument> {
  try {
    const data = await pdfParse(await fs.readFile(filePath));
    return {
      text: data.text,
      meta: extractMeta(data.text)
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file");
  }
}

async function parseDocx(filePath: string): Promise<ParsedDocument> {
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

function extractMeta(text: string) {
  // Simple extraction of potential name and contact info
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const name = lines[0]; // Assume first line might be name
  
  // Look for email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;
  
  // Look for phone
  const phoneMatch = text.match(/(\+\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  
  return { name, email, phone };
}
