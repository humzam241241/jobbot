import mammoth from "mammoth";
import fs from "fs";

export async function extractDocxText(filePath: string): Promise<string> {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error: any) {
    console.error("Error extracting DOCX text:", error);
    throw new Error(`Failed to extract DOCX text: ${error.message}`);
  }
}
