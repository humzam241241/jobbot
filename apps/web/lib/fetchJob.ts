import * as cheerio from "cheerio";
export async function fetchJobDescription(url: string): Promise<{ text:string; blocked:boolean; }> {
  try{
    const r = await fetch(url,{ headers:{ "user-agent":"Mozilla/5.0" }, cache:"no-store" });
    if(!r.ok){ return { text:"", blocked:true }; }
    const html = await r.text();
    const $ = cheerio.load(html); $("script,style,noscript").remove();
    const text = $("body").text().replace(/\s+/g," ").trim();
    const blocked = /linkedin\.com/.test(url) && text.length < 500;
    return { text: text.slice(0,20000), blocked };
  }catch{ return { text:"", blocked:true }; }
}
