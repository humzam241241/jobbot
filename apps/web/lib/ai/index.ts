// apps/web/lib/ai/index.ts
import "server-only";

// Simple AI provider interface
export interface AIProvider {
  generateText: (prompt: string) => Promise<string>;
}

// Default AI provider that returns a simple response
const defaultProvider: AIProvider = {
  generateText: async (prompt: string) => {
    console.log("Using default AI provider with prompt:", prompt.substring(0, 100) + "...");
    
    // For testing purposes, generate a simple response
    if (prompt.includes("resume")) {
      return `
        <h1>John Doe</h1>
        <p>123 Main Street, Anytown, USA | john.doe@example.com | (555) 123-4567</p>
        
        <h2>Summary</h2>
        <p>Experienced software developer with expertise in web development and cloud technologies.</p>
        
        <h2>Experience</h2>
        <h3>Software Engineer | Tech Company | 2020-Present</h3>
        <ul>
          <li>Developed and maintained web applications using React and Node.js</li>
          <li>Implemented CI/CD pipelines using GitHub Actions</li>
          <li>Optimized database queries resulting in 30% performance improvement</li>
        </ul>
        
        <h2>Education</h2>
        <p>Bachelor of Science in Computer Science | University | 2016-2020</p>
        
        <h2>Skills</h2>
        <p>JavaScript, TypeScript, React, Node.js, AWS, Docker, Git</p>
      `;
    } else if (prompt.includes("cover")) {
      return `
        <h1>John Doe</h1>
        <p>123 Main Street, Anytown, USA | john.doe@example.com | (555) 123-4567</p>
        
        <h2>Dear Hiring Manager,</h2>
        
        <p>I am writing to express my interest in the Software Engineer position at your company. With my experience in web development and cloud technologies, I believe I would be a valuable addition to your team.</p>
        
        <p>Throughout my career, I have developed strong skills in JavaScript, TypeScript, React, and Node.js. I have also worked extensively with AWS and Docker, which I understand are key technologies used at your company.</p>
        
        <p>I look forward to the opportunity to discuss how my skills and experience align with your needs.</p>
        
        <p>Sincerely,<br>John Doe</p>
      `;
    } else {
      return "Generated content based on your prompt.";
    }
  }
};

// Map of model names to providers
const providers: Record<string, AIProvider> = {
  "auto": defaultProvider,
  "claude-4": defaultProvider,
  "claude-3-opus": defaultProvider,
  "claude-3-sonnet": defaultProvider,
  "claude-3-haiku": defaultProvider,
  "gpt-5": defaultProvider,
  "gpt-4-turbo": defaultProvider,
  "gpt-4": defaultProvider,
  "gpt-3.5-turbo": defaultProvider,
  "gemini-2.5-pro": defaultProvider,
  "gemini-2.0-pro": defaultProvider,
  "gemini-1.5-pro": defaultProvider,
  "gemini-1.5-ultra": defaultProvider,
  "openrouter/mistral-large": defaultProvider,
  "openrouter/deepseek-coder": defaultProvider,
  "openrouter/solar": defaultProvider,
  "openrouter/mixtral-8x7b": defaultProvider,
};

// Get AI provider based on model name
export function getAiProvider(model: string = "auto"): AIProvider {
  return providers[model] || defaultProvider;
}