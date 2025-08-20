import fs from "node:fs";
import path from "node:path";
export type Stage = "validating"|"parsing_resume"|"fetching_job"|"calling_llm"|"generating_docs"|"saving"|"done"|"error";
export type Progress = { key: string; step: Stage; percent: number; label: string; error?: string };
const base = path.join(process.cwd(), "apps","web",".next","cache","jobbot-progress");
function ensure(){ if(!fs.existsSync(base)) fs.mkdirSync(base,{recursive:true}); }
export function setProgress(p:Progress){ ensure(); fs.writeFileSync(path.join(base,`${p.key}.json`), JSON.stringify(p)); }
export function getProgress(key:string):Progress{ ensure(); const f=path.join(base,`${key}.json`); if(!fs.existsSync(f)) return {key,step:"validating",percent:0,label:"Initializing..."}; try{ return JSON.parse(fs.readFileSync(f,"utf8")); }catch{ return {key,step:"error",percent:0,label:"Progress parse error",error:"parse"}; } }
export function clearProgress(key:string){ try{ fs.unlinkSync(path.join(base,`${key}.json`)); }catch{} }
