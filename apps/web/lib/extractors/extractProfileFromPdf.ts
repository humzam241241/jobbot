import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { ProfileSchema, type Profile } from "@/lib/schemas/profile";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\-\s().]{7,}\d)/;
const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/i;
const LOCATION_HINTS = /(Toronto|Mississauga|Ontario|ON|Canada|[A-Za-z\s]+,\s?[A-Za-z]{2,})/i;
const DEGREE_HINTS = /(Bachelor|Master|B\.Sc\.|BSc|BEng|MEng|M\.Sc\.|MSc|PhD|Diploma|Associate)/i;
const DATE_RE = /\b(20\d{2}|19\d{2})\b/g;

function lines(text: string) { return text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); }
function dedupe<T>(arr: T[]) { return Array.from(new Set(arr)); }

// Very light heuristics + section sniffing
function naiveParse(text: string): Partial<Profile> {
  const ls = lines(text);
  const top = ls.slice(0, 10).join(" "); // header zone

  const email = (top.match(EMAIL_RE) || ls.join(" ").match(EMAIL_RE))?.[0];
  const phone = (top.match(PHONE_RE) || ls.join(" ").match(PHONE_RE))?.[0];
  const website = (top.match(URL_RE) || ls.join(" ").match(URL_RE))?.[0];
  const location = (top.match(LOCATION_HINTS) || ls.join(" ").match(LOCATION_HINTS))?.[0];

  // name = first non-empty line that isn't email/phone/url
  let name = ls[0];
  for (const l of ls.slice(0, 5)) {
    if (!EMAIL_RE.test(l) && !PHONE_RE.test(l) && !URL_RE.test(l) && l.split(" ").length <= 6) {
      name = l.trim();
      break;
    }
  }

  // crude skills scrape (line containing "Skills" or comma list)
  const skillsLineIdx = ls.findIndex(l => /skills/i.test(l));
  let skills: string[] = [];
  if (skillsLineIdx !== -1) {
    const blob = ls.slice(skillsLineIdx, skillsLineIdx + 4).join(" ");
    skills = dedupe(blob.split(/[,•;·]/).map(s=>s.trim()).filter(s=>s && s.length<40));
  }

  // experience blocks: look for lines with " | " or degree/date patterns nearby
  const experience: Profile["experience"] = [];
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    const pipey = l.includes("|");
    const datey = (l.match(DATE_RE) || []).length >= 1;
    if (pipey || datey) {
      // e.g. "Software Engineer | Tech Company | 2023–Present"
      const parts = l.split("|").map(p=>p.trim());
      if (parts.length >= 2) {
        const [maybeTitle, maybeCompany, maybeDates] = parts;
        const bulletLines: string[] = [];
        let j = i+1;
        while (j < ls.length && (/^[-•·]/.test(ls[j]) || ls[j].length < 120)) {
          if (/^[-•·]/.test(ls[j])) bulletLines.push(ls[j].replace(/^[-•·]\s?/, "").trim());
          else if (ls[j] && !ls[j].match(EMAIL_RE) && !ls[j].includes("|")) bulletLines.push(ls[j]);
          j++;
          if (bulletLines.length > 8) break;
        }
        experience.push({
          title: maybeTitle || "",
          company: maybeCompany || "",
          startDate: maybeDates,
          endDate: undefined,
          bullets: dedupe(bulletLines).slice(0,8),
        });
      }
    }
  }

  // education lines with degree hints
  const education: Profile["education"] = [];
  ls.forEach(l => {
    if (DEGREE_HINTS.test(l)) {
      // e.g. "B.Sc. Mechanical Engineering — Ontario Tech University — 2022–2026"
      const parts = l.split(/[-—|]/).map(p=>p.trim());
      education.push({
        school: parts[1] || parts[0],
        degree: parts[0],
        field: parts[2]?.includes("Engineering") ? parts[2] : undefined,
      });
    }
  });

  // summary near top if a line contains "Summary" or objective-ish
  let summary = "";
  const summaryIdx = ls.findIndex(l => /summary|objective/i.test(l));
  if (summaryIdx !== -1) {
    summary = ls.slice(summaryIdx+1, summaryIdx+4).join(" ");
  }

  return {
    name: name?.replace(/\s{2,}/g, " ").trim(),
    email, phone, website, location,
    summary: summary || undefined,
    skills: skills.slice(0, 30),
    experience: experience.slice(0, 6),
    education: education.slice(0, 4),
  };
}

/**
 * Extracts profile information from a PDF or DOCX file
 * @param buffer The file buffer
 * @param fileType Optional file type ('pdf' or 'docx')
 * @returns A Profile object with extracted information
 * @throws Error if extraction fails or required fields are missing
 */
export async function extractProfileFromPdf(buffer: Buffer, fileType?: string): Promise<Profile> {
  let text: string;
  
  // Determine file type if not provided
  if (!fileType) {
    // Simple file type detection based on magic numbers
    const header = buffer.slice(0, 4).toString('hex');
    if (header === '25504446') { // %PDF
      fileType = 'pdf';
    } else if (header === '504b0304') { // PK..
      fileType = 'docx';
    } else {
      throw new Error("Unsupported file format. Please provide a PDF or DOCX file.");
    }
  }
  
  // Extract text based on file type
  if (fileType === 'pdf') {
    const data = await pdfParse(buffer);
    text = data.text;
  } else if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    throw new Error("Unsupported file format. Please provide a PDF or DOCX file.");
  }
  
  // Parse the extracted text
  const parsed = naiveParse(text);
  
  // Validate the parsed data
  const result = ProfileSchema.safeParse({
    name: parsed.name || "",
    email: parsed.email,
    phone: parsed.phone,
    website: parsed.website,
    location: parsed.location,
    summary: parsed.summary,
    skills: parsed.skills || [],
    experience: parsed.experience || [],
    education: parsed.education || [],
  });
  
  if (!result.success) {
    throw new Error(`Failed to extract valid profile: ${result.error.message}`);
  }
  
  // Check for required fields
  if (!result.data.name || result.data.name === "Unknown") {
    throw new Error("Could not extract name from the document. Please review the extracted profile.");
  }
  
  if (!result.data.email && !result.data.phone) {
    throw new Error("Could not extract contact information. Please review the extracted profile.");
  }
  
  if (result.data.experience.length === 0 && result.data.education.length === 0) {
    throw new Error("Could not extract experience or education information. Please review the extracted profile.");
  }
  
  return result.data;
}