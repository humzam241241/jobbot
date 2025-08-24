import pdfParse from "pdf-parse";
import fs from "node:fs/promises";

const MAX_INPUT_CHARS = 60_000;
const TRUNC_SUFFIX = "\n\n[... truncated for length ...]";

export async function extractResumeText(filePath: string, fileType: string) {
  if (fileType.includes("pdf")) {
    const data = await fs.readFile(filePath);
    const parsed = await pdfParse(data);
    return (parsed.text || "").replace(/\r/g, "");
  }
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  return raw;
}

export function safeComposeUserPayload(schemaJson: any, resumeText: string, jobDescription: string) {
  function truncate(s: string) {
    if (!s) return "";
    return s.length > MAX_INPUT_CHARS ? s.slice(0, MAX_INPUT_CHARS) + TRUNC_SUFFIX : s;
  }
  const payload = {
    schema: schemaJson,
    resume: truncate(resumeText),
    jobDescription: truncate(jobDescription),
    style: {
      maxPages: 1,
      bulletVerbWhitelist: ["built","led","designed","deployed","optimized","implemented","improved","automated","validated","reduced","increased"],
      banPhrases: ["Responsible for","Worked on","Helped with"]
    }
  };
  return JSON.stringify(payload);
}



