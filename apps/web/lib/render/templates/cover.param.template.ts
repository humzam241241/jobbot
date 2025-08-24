import { StyleManifest } from "../../style/manifest";
import { buildPrintCss } from "../print-css";

const esc = (s: string) => (s || "").replace(/[&<>"]/g, m => ({ 
  "&": "&amp;", 
  "<": "&lt;", 
  ">": "&gt;", 
  "\"": "&quot;" 
}[m] as string));

export function coverTemplate(m: StyleManifest, data: any, jobDescription: string) {
  const css = buildPrintCss(m);
  
  // Extract job details from description (position, company)
  const jobLines = (jobDescription || "").split("\n");
  let position = "";
  let company = "";
  
  // Try to extract position and company from first few lines
  for (let i = 0; i < Math.min(5, jobLines.length); i++) {
    const line = jobLines[i].trim();
    if (!position && /position|job title|role/i.test(line)) {
      position = line.replace(/position|job title|role/i, "").trim().replace(/:/g, "");
    }
    if (!company && /company|organization|employer/i.test(line)) {
      company = line.replace(/company|organization|employer/i, "").trim().replace(/:/g, "");
    }
  }
  
  // If we couldn't extract, use first line as position
  if (!position && jobLines.length > 0) {
    position = jobLines[0].trim();
  }
  
  // Format current date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  // Extract contact information
  const email = data.header?.email || "";
  const phone = data.header?.phone || "";
  const location = data.header?.location || "";
  const contacts = [email, phone, location].filter(Boolean);
  
  // Determine if we should use a professional letterhead style or a centered style
  // based on the original document's formatting
  const useLetterheadStyle = m.page.margins.top < 60; // If top margin is small, likely using letterhead style
  
  // Generate additional CSS for cover letter specific styling
  const additionalCss = `
    .letterhead-header {
      text-align: left;
      margin-bottom: ${m.spacings.sectionTop * 2}pt;
    }
    .centered-header {
      text-align: center;
      margin-bottom: ${m.spacings.sectionTop * 2}pt;
    }
    .cover-letter-header {
      margin-top: ${m.spacings.sectionTop * 2}pt;
      margin-bottom: ${m.spacings.sectionTop * 2}pt;
    }
    .date {
      margin-bottom: ${m.spacings.para * 2}pt;
    }
    .position, .company, .location {
      margin-bottom: ${m.spacings.para}pt;
    }
    .greeting {
      margin-bottom: ${m.spacings.sectionTop}pt;
      font-weight: normal;
    }
    .cover-letter-body {
      margin-bottom: ${m.spacings.sectionTop * 2}pt;
      text-align: justify;
    }
    .cover-letter-body p {
      margin-bottom: ${m.spacings.para * 2}pt;
      text-indent: ${m.bullets.indentLeft / 2}pt;
      line-height: ${m.fonts.primary.lineHeight * 1.1};
    }
    .signature {
      margin-top: ${m.spacings.sectionTop * 2}pt;
    }
    .signature-name {
      margin-top: ${m.spacings.sectionTop}pt;
      font-weight: ${m.fonts.heading.weight};
    }
  `;
  
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${css}${additionalCss}</style></head><body>
  ${useLetterheadStyle ? `
    <div class="letterhead-header">
      <h1>${esc(data.header?.fullName || "")}</h1>
      <div class="contacts">${contacts.map(esc).join(" · ")}</div>
    </div>
    
    <div class="cover-letter-header">
      <div class="date">${formattedDate}</div>
      <div class="position">${esc(position)}</div>
      <div class="company">${esc(company)}</div>
      <div class="location">${esc(location)}</div>
    </div>
  ` : `
    <div class="centered-header">
      <h1>${esc(data.header?.fullName || "")}</h1>
      <div class="contacts">${contacts.map(esc).join(" · ")}</div>
    </div>
    
    <div class="cover-letter-header" style="text-align: ${useLetterheadStyle ? 'left' : 'center'}">
      <div class="date">${formattedDate}</div>
      <div class="position">${esc(position)}</div>
      <div class="company">${esc(company)}</div>
      <div class="location">${esc(location)}</div>
    </div>
  `}
  
  <div class="greeting">Dear Hiring Manager,</div>
  
  <div class="cover-letter-body">
    ${(data.summary || "I'm excited to apply for this role.")
      .split('\n\n')
      .filter(para => para.trim().length > 0)
      .map(para => `<p>${esc(para)}</p>`)
      .join('')}
  </div>
  
  <div class="signature">
    <div>Sincerely,</div>
    <div class="signature-name">${esc(data.header?.fullName || "")}</div>
  </div>
  </body></html>`;
}
