import fs from "fs";
import path from "path";

const appDir = path.join(process.cwd(), "app");

function routeFrom(abs: string) {
  const rel = abs.split(appDir)[1].replace(/\\/g, "/");
  return rel
    .replace(/\/page\.tsx$/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/^\//, "")
    .replace(/\(.*?\)\//g, ""); // strip route group segments
}

const pages: Record<string,string[]> = {};
function walk(dir:string){
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && entry.name === "page.tsx") {
      const r = "/"+routeFrom(p);
      pages[r] = pages[r] || [];
      pages[r].push(p);
    }
  }
}
walk(appDir);

let hasDupes = false;
for (const [r, files] of Object.entries(pages)) {
  if (files.length > 1) {
    hasDupes = true;
    console.error("DUPLICATE ROUTE:", r, "\n ->", files.join("\n -> "), "\n");
  }
}
if (hasDupes) {
  process.exit(1);
} else {
  console.log("No duplicate routes found.");
}
