import MarkdownIt from "markdown-it";
import { Document, Packer, Paragraph } from "docx";
import fs from "node:fs/promises";
import path from "node:path";
const md = new MarkdownIt();
function mdParas(src:string){ return md.render(src).replace(/<[^>]+>/g,"").split(/\r?\n/).filter(Boolean).map(t=>new Paragraph(t)); }
export async function writeDocx(outDirAbs:string,name:string,markdown:string){
  const doc=new Document({ sections:[{properties:{},children:mdParas(markdown)}]});
  const buf=await Packer.toBuffer(doc);
  await fs.mkdir(outDirAbs,{recursive:true});
  const abs=path.join(outDirAbs,name); await fs.writeFile(abs,buf);
  const pub = abs.split(path.join(process.cwd(),"apps","web","public"))[1];
  return (pub||"").replace(/\\/g,"/");
}
