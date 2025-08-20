import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import Turndown from "turndown";
import { request } from "undici";

const td = new Turndown();

export async function extractJDFromUrl(url: string): Promise<{title?:string; company?:string; location?:string; description:string}> {
  const res = await request(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ResumeBot/1.0)",
      "accept-language": "en-US,en;q=0.9",
      "accept": "text/html,application/xhtml+xml",
    },
    maxRedirections: 3,
  });
  const html = await res.body.text();
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // Fast paths (heuristics for common boards)
  const selectors = [
    // LinkedIn
    ".jobs-description__container", 
    ".jobs-box__html-content",
    // Lever
    ".posting-content",
    ".section-wrapper",
    // Greenhouse
    "#content",
    ".content",
    "[data-qa='job-description']",
    // Workday
    ".job-post-content",
    // Generic
    ".job-description",
    ".job",
    "[role='main']",
    "main",
    "article"
  ];
  
  // Try to find content using common selectors
  const fastContent = selectors
    .map(sel => doc.querySelector(sel)?.textContent?.trim())
    .filter(Boolean)[0];

  let markdown = "";
  if (fastContent && fastContent.length > 400) {
    // If we found content using selectors, convert it to markdown
    markdown = td.turndown(fastContent);
  } else {
    // Fall back to Readability for generic extraction
    const reader = new Readability(doc);
    const article = reader.parse();
    markdown = td.turndown(article?.textContent ?? article?.content ?? doc.body.textContent ?? "");
  }
  
  // Clean up the markdown
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
  
  // If extraction failed (too short content), use LLM as a last resort
  if (markdown.length < 300) {
    try {
      // As a last resort, pass raw HTML to LLM parser
      const { generate } = await import("../llm/LLMRouter");
      const { text } = await generate({
        purpose: "jdParsing",
        messages: [
          { role: "system", content: "Extract the job responsibilities and requirements only." },
          { role: "user", content: html.slice(0, 20000) }
        ],
        maxTokens: 1200
      });
      markdown = text.trim();
    } catch (error) {
      console.error("LLM extraction failed:", error);
      // If LLM extraction fails, return whatever we have
    }
  }
  
  // Try to extract title and company if possible
  let title: string | undefined;
  let company: string | undefined;
  let location: string | undefined;
  
  // Common patterns for job titles
  const titleElements = [
    doc.querySelector("h1"),
    doc.querySelector(".job-title"),
    doc.querySelector("[data-qa='job-title']"),
    doc.querySelector(".posting-headline h2"),
    doc.querySelector("title")
  ].filter(Boolean);
  
  if (titleElements.length > 0) {
    title = titleElements[0]?.textContent?.trim();
  }
  
  // Common patterns for company names
  const companyElements = [
    doc.querySelector(".company-name"),
    doc.querySelector("[data-qa='company-name']"),
    doc.querySelector(".posting-headline h3"),
    doc.querySelector(".company")
  ].filter(Boolean);
  
  if (companyElements.length > 0) {
    company = companyElements[0]?.textContent?.trim();
  }
  
  // Common patterns for location
  const locationElements = [
    doc.querySelector(".location"),
    doc.querySelector("[data-qa='location']"),
    doc.querySelector(".posting-location"),
    doc.querySelector(".job-location")
  ].filter(Boolean);
  
  if (locationElements.length > 0) {
    location = locationElements[0]?.textContent?.trim();
  }
  
  return { 
    title, 
    company, 
    location, 
    description: markdown 
  };
}
