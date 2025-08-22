import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { createLogger } from '@/lib/logger';

const logger = createLogger('job-extractor');

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    logger.info('Extracting job description from URL', { url });

    // Launch puppeteer with stealth mode
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid being blocked
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });
      
      // Set timeout to 15 seconds
      await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
      
      // Wait a bit for any dynamic content to load
      await page.waitForTimeout(2000);

      // Extract text from main content areas
      const text = await page.evaluate(() => {
        // Common job description selectors
        const selectors = [
          // Generic content containers
          'main', 
          'article',
          '[role="main"]',
          '.job-description',
          '.description',
          '.posting-body',
          // LinkedIn
          '.description__text',
          // Indeed
          '#jobDescriptionText',
          // Glassdoor
          '.jobDescriptionContent',
          // ZipRecruiter
          '.job_description',
          // Monster
          '.job-description-content',
        ];

        // Try each selector
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            // Get the element with the most text content
            let bestElement = elements[0];
            let maxLength = elements[0].textContent?.length || 0;
            
            for (let i = 1; i < elements.length; i++) {
              const length = elements[i].textContent?.length || 0;
              if (length > maxLength) {
                maxLength = length;
                bestElement = elements[i];
              }
            }
            
            return bestElement.textContent || '';
          }
        }

        // Fallback: get all text from body
        return document.body.innerText;
      });

      await browser.close();

      // Clean up the text
      const cleanedText = text
        .replace(/\\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000); // Limit to 10,000 characters

      if (!cleanedText || cleanedText.length < 50) {
        return NextResponse.json({ 
          error: 'Could not extract meaningful job description from the URL',
          text: ''
        }, { status: 400 });
      }

      return NextResponse.json({ text: cleanedText });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    logger.error('Error extracting job description', { error });
    return NextResponse.json({ 
      error: error.message || 'Error extracting job description',
      text: ''
    }, { status: 500 });
  }
}
