/**
 * Error thrown when a site blocks automated extraction
 */
export class BlockedExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedExtractionError';
  }
}

/**
 * Extracts job information from a URL or text
 * @param params Object containing URL or text
 * @returns Extracted job data
 */
export async function extractJob(params: { url?: string; jdText?: string }) {
  const { url, jdText } = params;
  
  // If text is provided, use it directly
  if (jdText) {
    return {
      title: extractTitle(jdText),
      company: extractCompany(jdText),
      location: extractLocation(jdText),
      description: jdText,
      skills: extractSkills(jdText),
      source: 'text',
    };
  }
  
  // If URL is provided, fetch and extract
  if (url) {
    try {
      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check for common bot detection patterns
      if (
        html.includes('captcha') ||
        html.includes('robot') ||
        html.includes('automated') ||
        html.includes('blocked') ||
        html.includes('access denied')
      ) {
        throw new BlockedExtractionError('This site blocked automated extraction');
      }
      
      // Extract text from HTML
      const text = extractTextFromHtml(html);
      
      return {
        title: extractTitle(text),
        company: extractCompany(text),
        location: extractLocation(text),
        description: text,
        skills: extractSkills(text),
        source: 'url',
        sourceUrl: url,
      };
    } catch (error) {
      if (error instanceof BlockedExtractionError) {
        throw error;
      }
      throw new Error(`Failed to extract job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  throw new Error('Either URL or job description text is required');
}

/**
 * Extracts text from HTML
 * @param html HTML content
 * @returns Plain text
 */
function extractTextFromHtml(html: string): string {
  // Simple HTML to text conversion
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts job title from text
 * @param text Job description text
 * @returns Extracted job title
 */
function extractTitle(text: string): string {
  // Simple heuristic to extract job title
  const lines = text.split('\n');
  for (const line of lines.slice(0, 10)) {
    if (
      line.includes('Engineer') ||
      line.includes('Developer') ||
      line.includes('Manager') ||
      line.includes('Designer') ||
      line.includes('Analyst')
    ) {
      return line.trim();
    }
  }
  return 'Job Position';
}

/**
 * Extracts company name from text
 * @param text Job description text
 * @returns Extracted company name
 */
function extractCompany(text: string): string {
  // Simple heuristic to extract company name
  const lines = text.split('\n');
  for (const line of lines.slice(0, 15)) {
    if (line.includes('Company:')) {
      return line.replace('Company:', '').trim();
    }
  }
  return 'Company';
}

/**
 * Extracts location from text
 * @param text Job description text
 * @returns Extracted location
 */
function extractLocation(text: string): string {
  // Simple heuristic to extract location
  const lines = text.split('\n');
  for (const line of lines.slice(0, 15)) {
    if (line.includes('Location:')) {
      return line.replace('Location:', '').trim();
    }
  }
  return 'Remote';
}

/**
 * Extracts skills from text
 * @param text Job description text
 * @returns Array of extracted skills
 */
function extractSkills(text: string): string[] {
  const skills = new Set<string>();
  
  // Common programming languages
  const programmingLanguages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Ruby', 'Go', 'Rust',
    'PHP', 'Swift', 'Kotlin', 'Scala', 'Perl', 'R', 'SQL', 'HTML', 'CSS',
  ];
  
  // Common frameworks and libraries
  const frameworks = [
    'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask',
    'Spring', 'ASP.NET', 'Laravel', 'Rails', 'TensorFlow', 'PyTorch', 'Pandas',
    'Tailwind', 'Bootstrap', 'jQuery', 'Redux', 'GraphQL', 'REST',
  ];
  
  // Common tools and platforms
  const tools = [
    'Git', 'GitHub', 'GitLab', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Jenkins', 'CircleCI', 'Travis CI', 'Jira', 'Confluence', 'Agile', 'Scrum',
    'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'Webpack', 'Babel', 'ESLint',
  ];
  
  const allSkills = [...programmingLanguages, ...frameworks, ...tools];
  
  for (const skill of allSkills) {
    if (text.includes(skill)) {
      skills.add(skill);
    }
  }
  
  return Array.from(skills);
}
