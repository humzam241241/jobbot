import { FORMAT_POLICY } from "./formatPolicy";

export function buildResumeMessages({ masterResumeText, jdText, userNotes }:{
  masterResumeText: string; jdText: string; userNotes?: string;
}) {
  const sys = `ROLE: Application Materials Tailor\n${FORMAT_POLICY}`;
  const dev = `OUTPUT: Provide structured blocks (Header, Summary, Skills, Experience{company,title,dates,bullets}, Projects, Education, Certifications) and a "StyleManifest" (fonts, sizes, bullet indent, section spacing).`;
  const usr = `MASTER RESUME:\n${masterResumeText}\n\nJOB DESCRIPTION:\n${jdText}\n\nNOTES:\n${userNotes ?? "N/A"}\n\nTASK: Produce a tailored resume strictly from the Master Resume content.`;
  return [
    { role: "system", content: sys },
    { role: "assistant", content: dev },
    { role: "user", content: usr },
  ] as const;
}

export function buildCoverLetterMessages({ masterResumeText, jdText, userNotes }:{
  masterResumeText: string; jdText: string; userNotes?: string;
}) {
  const sys = `ROLE: Application Materials Tailor for COVER LETTER\n${FORMAT_POLICY}`;
  const dev = `COVER LETTER: ≤ 1 page (300–400 words), matches resume style, includes header and sign-off; no invented facts.`;
  const usr = `MASTER RESUME:\n${masterResumeText}\n\nJOB DESCRIPTION:\n${jdText}\n\nNOTES:\n${userNotes ?? "N/A"}\n\nTASK: Produce a concise, 1-page cover letter aligned to the JD.`;
  return [
    { role: "system", content: sys },
    { role: "assistant", content: dev },
    { role: "user", content: usr },
  ] as const;
}
