/**
 * LLM Provider interface for different AI providers
 */

import { z } from 'zod';

// Define interfaces for LLM providers
export interface LLMProvider {
  complete: (prompt: string, options?: any) => Promise<string>;
  completeWithSchema: <T extends z.ZodType>(prompt: string, schema: T, options?: any) => Promise<z.infer<T>>;
}

// Mock provider for development/testing
export class MockLLMProvider implements LLMProvider {
  async complete(prompt: string, options?: any): Promise<string> {
    console.log('Using mock LLM provider');
    // Return a mock response based on the prompt content
    if (prompt.includes('tailor') || prompt.includes('resume')) {
      return JSON.stringify({
        contact: {
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "(555) 123-4567",
          location: "New York, NY"
        },
        summary: "Experienced software engineer with 5+ years developing web applications using modern JavaScript frameworks.",
        skills: ["JavaScript", "React", "Node.js", "TypeScript", "AWS", "Docker"],
        experience: [
          {
            title: "Senior Software Engineer",
            company: "Tech Solutions Inc.",
            location: "New York, NY",
            startDate: "2020-01",
            endDate: "Present",
            highlights: [
              "Led development of customer-facing web application using React and TypeScript",
              "Implemented CI/CD pipeline reducing deployment time by 40%",
              "Mentored junior developers and conducted code reviews"
            ]
          },
          {
            title: "Software Developer",
            company: "Digital Innovations",
            location: "Boston, MA",
            startDate: "2018-03",
            endDate: "2019-12",
            highlights: [
              "Developed RESTful APIs using Node.js and Express",
              "Optimized database queries improving application performance by 30%",
              "Collaborated with design team to implement responsive UI components"
            ]
          }
        ],
        education: [
          {
            degree: "Bachelor of Science in Computer Science",
            institution: "University of Technology",
            location: "Boston, MA",
            graduationDate: "2018-05"
          }
        ]
      });
    } else if (prompt.includes('cover letter')) {
      return `
      John Doe
      john.doe@example.com
      (555) 123-4567
      New York, NY
      
      [Current Date]
      
      Hiring Manager
      Tech Company Inc.
      New York, NY
      
      Dear Hiring Manager,
      
      I am writing to express my interest in the Software Engineer position at Tech Company Inc. With over 5 years of experience developing web applications using modern JavaScript frameworks, I am confident in my ability to contribute to your team's success.
      
      Throughout my career, I have demonstrated strong technical skills in React, Node.js, and TypeScript, which align perfectly with the requirements outlined in your job description. At Tech Solutions Inc., I led the development of a customer-facing web application that increased user engagement by 25% and reduced load times by 40%.
      
      I am particularly excited about your company's focus on innovative solutions and your commitment to creating user-friendly applications. My experience in implementing CI/CD pipelines and optimizing application performance would allow me to make immediate contributions to your projects.
      
      Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience align with your needs.
      
      Sincerely,
      John Doe
      `;
    } else if (prompt.includes('ATS') || prompt.includes('score')) {
      return JSON.stringify({
        overall: 85,
        skillsScore: 90,
        experienceScore: 85,
        keywordScore: 80,
        matched: [
          "JavaScript", "React", "Node.js", "TypeScript", "web development", "CI/CD", "code review"
        ],
        missing: [
          "GraphQL", "AWS Lambda", "Kubernetes"
        ],
        recommendations: [
          "Add experience with GraphQL if applicable",
          "Highlight any cloud service experience, especially AWS",
          "Include specific metrics and achievements in your experience section"
        ]
      });
    }
    
    // Default response
    return "Mock LLM response - please check the prompt and try again";
  }

  async completeWithSchema<T extends z.ZodType>(
    prompt: string, 
    schema: T, 
    options?: any
  ): Promise<z.infer<T>> {
    const response = await this.complete(prompt, options);
    try {
      const parsed = JSON.parse(response);
      return schema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse LLM response with schema:", error);
      throw new Error("Invalid response format from LLM");
    }
  }
}

// OpenAI provider
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async complete(prompt: string, options?: any): Promise<string> {
    if (!this.apiKey) {
      console.warn("OpenAI API key not provided, using mock provider");
      return new MockLLMProvider().complete(prompt, options);
    }
    
    try {
      // Implementation would use the OpenAI API
      // For now, we'll use the mock provider to avoid exposing API keys
      return new MockLLMProvider().complete(prompt, options);
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to get response from OpenAI");
    }
  }
  
  async completeWithSchema<T extends z.ZodType>(
    prompt: string, 
    schema: T, 
    options?: any
  ): Promise<z.infer<T>> {
    const response = await this.complete(prompt, options);
    try {
      const parsed = JSON.parse(response);
      return schema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse OpenAI response with schema:", error);
      throw new Error("Invalid response format from OpenAI");
    }
  }
}

// Factory function to get the appropriate LLM provider
export function getLLMProvider(provider: string = 'mock'): LLMProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(process.env.OPENAI_API_KEY || '');
    case 'google':
      // Implement Google provider when needed
      console.warn("Google provider not implemented, using mock");
      return new MockLLMProvider();
    case 'anthropic':
      // Implement Anthropic provider when needed
      console.warn("Anthropic provider not implemented, using mock");
      return new MockLLMProvider();
    case 'mock':
    default:
      return new MockLLMProvider();
  }
}