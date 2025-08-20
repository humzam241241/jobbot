import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

// Enhanced URL validation and correction
function normalizeJobUrl(url: string): string {
	let normalized = url.trim();
	
	// Add protocol if missing
	if (!/^https?:\/\//i.test(normalized)) {
		normalized = "https://" + normalized;
	}
	
	// Common typo corrections
	const corrections: Record<string, string> = {
		'linkdin.com': 'linkedin.com',
		'linkedn.com': 'linkedin.com',
		'lnkedin.com': 'linkedin.com',
		'indead.com': 'indeed.com',
		'indeeed.com': 'indeed.com',
		'glassdor.com': 'glassdoor.com',
		'glassdoor.co': 'glassdoor.com',
	};
	
	for (const [typo, correct] of Object.entries(corrections)) {
		normalized = normalized.replace(typo, correct);
	}
	
	return normalized;
}

// Site-specific extraction strategies
function extractJobText(dom: JSDOM, url: string): string {
	const doc = dom.window.document;
	
	// LinkedIn specific
	if (url.includes('linkedin.com')) {
		const jobDesc = doc.querySelector('.jobs-description__content, .description__text, .jobs-box__html-content');
		if (jobDesc) return jobDesc.textContent?.trim() || '';
	}
	
	// Indeed specific
	if (url.includes('indeed.com')) {
		const jobDesc = doc.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText, .icl-u-xs-mt--md');
		if (jobDesc) return jobDesc.textContent?.trim() || '';
	}
	
	// Glassdoor specific
	if (url.includes('glassdoor.com')) {
		const jobDesc = doc.querySelector('.jobDescriptionContent, .desc-content, [data-test="jobDescriptionText"]');
		if (jobDesc) return jobDesc.textContent?.trim() || '';
	}
	
	// Generic fallbacks
	const selectors = [
		'[class*="job-description"]',
		'[class*="description"]',
		'[id*="description"]',
		'[class*="content"]',
		'main',
		'article'
	];
	
	for (const selector of selectors) {
		const element = doc.querySelector(selector);
		if (element && element.textContent && element.textContent.length > 200) {
			return element.textContent.trim();
		}
	}
	
	return '';
}

export async function scrapeJobSummary(url: string): Promise<string> {
	try {
		// Normalize and validate URL
		const normalizedUrl = normalizeJobUrl(url);
		
		// Enhanced user agent with better browser simulation
		const headers = {
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.5",
			"accept-encoding": "gzip, deflate, br",
			"referer": "https://www.google.com/",
		};
		
		// Fetch with timeout and retries
		let response: Response;
		let lastError: Error | null = null;
		
		for (let attempt = 1; attempt <= 2; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
				
				response = await fetch(normalizedUrl, { 
					headers, 
					cache: "no-store",
					signal: controller.signal 
				});
				
				clearTimeout(timeoutId);
				
				if (response.ok) break;
				if (response.status === 403 || response.status === 429) {
					// Rate limited or blocked, wait and retry
					await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
					continue;
				}
			} catch (error) {
				lastError = error as Error;
				if (attempt === 2) throw lastError;
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
		}
		
		const html = await response!.text();
		
		if (!html || html.length < 100) {
			throw new Error("Received empty or minimal content");
		}
		
		const dom = new JSDOM(html, { url: normalizedUrl });
		
		// Try site-specific extraction first
		let text = extractJobText(dom, normalizedUrl);
		
		// Fallback to Readability
		if (!text || text.length < 200) {
			const reader = new Readability(dom.window.document);
			const article = reader.parse();
			text = article?.textContent || "";
		}
		
		// Clean up the text
		text = text
			.replace(/\s+/g, " ")
			.replace(/^\s*[•\-\*]\s*/gm, "• ") // Normalize bullet points
			.replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
			.trim();
		
		// If we have good content, return it
		if (text.length > 200) {
			return text.slice(0, 6000);
		}
		
		// Last resort: extract meta descriptions
		const metaSelectors = [
			'meta[name="description"]',
			'meta[property="og:description"]',
			'meta[name="twitter:description"]',
			'meta[property="description"]'
		];
		
		for (const selector of metaSelectors) {
			const meta = dom.window.document.querySelector(selector);
			const content = meta?.getAttribute("content");
			if (content && content.length > 50) {
				return content.slice(0, 6000);
			}
		}
		
		return "Unable to extract job description. The website may be blocking automated access. Please copy and paste the job description manually.";
		
	} catch (error: any) {
		console.error("Job scraping error:", error);
		
		// Provide helpful error messages based on error type
		if (error.name === "AbortError") {
			return "Request timed out. The website took too long to respond. Please try again or paste the job description manually.";
		}
		
		if (error.message?.includes("Failed to fetch") || error.code === "ENOTFOUND") {
			return "Unable to reach the website. Please check the URL and try again, or paste the job description manually.";
		}
		
		if (error.status === 403) {
			return "Access denied by the website. Please copy and paste the job description manually.";
		}
		
		if (error.status === 404) {
			return "Job posting not found. The URL may be expired or incorrect. Please verify the link or paste the job description manually.";
		}
		
		return `Failed to fetch job posting (${error.message}). Please copy and paste the job description manually.`;
	}
}
