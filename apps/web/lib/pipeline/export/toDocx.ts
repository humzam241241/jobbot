import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import type { ResumeJSON } from "../types";

function para(text: string) { return new Paragraph({ text }); }

export async function resumeToDocx(resume: ResumeJSON, outPath: string) {
  const children: Paragraph[] = [];
  for (const sec of resume.sections) {
    children.push(new Paragraph({ text: sec.heading, heading: HeadingLevel.HEADING_2 }));
    for (const c of sec.content) {
      if (c.type === "bullet") children.push(new Paragraph({ text: "• " + c.text }));
      else if (c.type === "subheading") children.push(new Paragraph({ text: c.text, heading: HeadingLevel.HEADING_3 }));
      else children.push(para(c.text));
    }
  }
  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, buf);
}

export async function coverToDocx(cl: { greeting: string; intro: string; body: string[]; closing: string; signature: string }, outPath: string) {
  const children: Paragraph[] = [
    para(cl.greeting), para(cl.intro),
    ...cl.body.map(b => para(b)),
    para(cl.closing), para(cl.signature)
  ];
  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, buf);
}
