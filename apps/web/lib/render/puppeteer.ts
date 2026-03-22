import puppeteer from "puppeteer-core";

let browser: import("puppeteer").Browser | null = null;

export async function getBrowser() {
  if (!browser) {
    try {
      browser = await puppeteer.launch({ 
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: 'new'
      });
    } catch (error) {
      console.error("Failed to launch browser:", error);
      throw error;
    }
  }
  return browser;
}

export async function htmlToPdf(html: string, outPath: string) {
  try {
    const b = await getBrowser();
    const page = await b.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ 
      path: outPath, 
      printBackground: true, 
      preferCSSPageSize: true 
    });
    await page.close();
  } catch (error) {
    console.error("Error converting HTML to PDF:", error);
    throw error;
  }
}
