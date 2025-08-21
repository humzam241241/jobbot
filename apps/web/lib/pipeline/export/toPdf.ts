import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export async function htmlToPdf(html: string, outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: (puppeteer as any).executablePath?.() || undefined,
    args: ["--no-sandbox","--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" }
  });
  await browser.close();
}
