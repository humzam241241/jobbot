import fs from 'fs';
import path from 'path';
import "server-only";
import { renderReactToHtml } from './serverRenderer';
async function lazyPuppeteerCore() {
  const mod = await import('puppeteer-core');
  return mod.default;
}
async function lazyChromeAwsLambda() {
  const mod = await import('chrome-aws-lambda');
  return mod.default;
}
import { createLogger } from '@/lib/logger';
import { PDFGenerationError, withPdfErrorHandling, createErrorPdf, retryWithBackoff } from './errorHandling';
import MasterResume, { MasterResumeProps } from '@/components/resume/MasterResume';
import CoverLetter, { CoverLetterProps } from '@/components/resume/CoverLetter';
import ATSReport, { ATSReportProps } from '@/components/resume/ATSReport';

const logger = createLogger('react-pdf-renderer');

// Keep track of the browser instance
let browserPromise: Promise<any> | null = null;

/**
 * Get or create a browser instance
 */
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        // Try to use chrome-aws-lambda for environments like Vercel
        const chrome = await lazyChromeAwsLambda();
        const puppeteer = await lazyPuppeteerCore();
        const executablePath = await chrome.executablePath;

        if (executablePath) {
          return puppeteer.launch({
            args: chrome.args,
            executablePath,
            headless: true,
          });
        } else {
          // Fallback to locally installed Chrome
          return puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: 
              process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : process.platform === 'linux'
                ? '/usr/bin/google-chrome'
                : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          });
        }
      } catch (error) {
        logger.error('Failed to launch browser', { error });
        throw error;
      }
    })();
  }
  
  return browserPromise;
}

/**
 * Generate a PDF from a React component
 */
export async function generatePdfFromReact<T extends React.ElementType>(
  Component: T,
  props: React.ComponentProps<T>,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  return withPdfErrorHandling(async () => {
    logger.info('Generating PDF from React component', { 
      component: Component.name,
      options
    });
    
    // Render the component to static HTML
    let html: string;
    try {
      html = await renderReactToHtml(<Component {...props} />);
    } catch (renderError: any) {
      throw new PDFGenerationError('Failed to render React component to HTML', {
        code: 'REACT_RENDER_ERROR',
        component: Component.name,
        details: { componentName: Component.name, props },
        cause: renderError
      });
    }
    
    // Wrap in a complete HTML document with doctype and meta tags
    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options.title || 'Document'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    
    // Get browser instance with retry
    const browser = await retryWithBackoff(
      () => getBrowser(),
      {
        maxRetries: 3,
        component: 'browser-launch',
        initialDelayMs: 1000
      }
    ).catch((error) => {
      throw new PDFGenerationError('Failed to launch browser for PDF generation', {
        code: 'BROWSER_LAUNCH_ERROR',
        component: 'puppeteer',
        cause: error
      });
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(wrappedHtml, { waitUntil: 'networkidle0' });
    
    // Set PDF options
    const pdfOptions: any = {
      format: options.size === 'A4' ? 'a4' : 'letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    };
    
    // Generate PDF with retry
    const pdfBuffer = await retryWithBackoff(
      () => page.pdf(pdfOptions),
      {
        maxRetries: 2,
        component: 'pdf-generation',
        initialDelayMs: 500
      }
    ).catch((error) => {
      throw new PDFGenerationError('Failed to generate PDF from HTML', {
        code: 'PDF_CONVERSION_ERROR',
        component: 'puppeteer-pdf',
        cause: error
      });
    });
    
    // Close the page (but keep the browser instance)
    await page.close();
    
    // Save to file if requested
    let filePath: string | undefined;
    if (options.saveToPath) {
      const fileName = options.fileName || `document_${Date.now()}.pdf`;
      const publicDir = path.join(process.cwd(), 'public', 'resumes');
      
      // Create directory if it doesn't exist
      try {
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        filePath = path.join(publicDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
      } catch (fsError: any) {
        throw new PDFGenerationError('Failed to save PDF to file system', {
          code: 'FILE_SYSTEM_ERROR',
          component: 'file-system',
          details: { filePath, fileName },
          cause: fsError
        });
      }
      
      logger.info(`PDF saved to ${filePath}`);
    }
    
    logger.info(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return { buffer: pdfBuffer, filePath };
  }, {
    component: `react-pdf-${Component.name}`,
    fallback: { buffer: createErrorPdf(new Error('PDF generation failed')) }
  });
}

/**
 * Generate a resume PDF from the MasterResume component
 */
export async function generateResumePdf(
  resumeProps: MasterResumeProps,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  return generatePdfFromReact(MasterResume, resumeProps, {
    title: options.title || `${resumeProps.name} - Resume`,
    size: options.size || 'Letter',
    fileName: options.fileName || `resume_${Date.now()}.pdf`,
    saveToPath: options.saveToPath
  });
}

/**
 * Generate a cover letter PDF from the CoverLetter component
 */
export async function generateCoverLetterPdf(
  coverLetterProps: CoverLetterProps,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  return generatePdfFromReact(CoverLetter, coverLetterProps, {
    title: options.title || `${coverLetterProps.name} - Cover Letter`,
    size: options.size || 'Letter',
    fileName: options.fileName || `cover_letter_${Date.now()}.pdf`,
    saveToPath: options.saveToPath
  });
}

/**
 * Generate an ATS report PDF from the ATSReport component
 */
export async function generateATSReportPdf(
  atsReportProps: ATSReportProps,
  options: {
    title?: string;
    size?: "Letter" | "A4";
    fileName?: string;
    saveToPath?: boolean;
  } = {}
): Promise<{ buffer: Buffer; filePath?: string }> {
  return generatePdfFromReact(ATSReport, atsReportProps, {
    title: options.title || `ATS Report - ${atsReportProps.name}`,
    size: options.size || 'Letter',
    fileName: options.fileName || `ats_report_${Date.now()}.pdf`,
    saveToPath: options.saveToPath
  });
}
