import pdf from "pdf-parse";
import fs from "fs";

export async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error: any) {
    console.error("Error extracting PDF text:", error);
    throw new Error(`Failed to extract PDF text: ${error.message}`);
  }
}
