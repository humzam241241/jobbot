import { describe, it, expect } from 'vitest';
import { ResumeSchema } from '../lib/schemas/resume';
import { parseWithSchema } from '../lib/json/extract';

describe('Resume Schema', () => {
  it('should validate a valid resume', () => {
    const validResume = {
      contact: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        links: ['https://linkedin.com/in/johndoe']
      },
      summary: 'Experienced software engineer with 5+ years in web development.',
      experience: [
        {
          company: 'Tech Corp',
          role: 'Senior Developer',
          start: '2020-01',
          end: '2023-05',
          bullets: [
            'Led team of 5 developers on a major project',
            'Reduced load times by 40% through optimization'
          ]
        }
      ],
      education: [
        {
          school: 'University of Technology',
          degree: 'BS in Computer Science',
          year: '2019'
        }
      ],
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript']
    };

    const result = ResumeSchema.safeParse(validResume);
    expect(result.success).toBe(true);
  });

  it('should extract and validate JSON from text', () => {
    const modelOutput = `
    I've analyzed the resume and job description. Here's the tailored resume:

    \`\`\`json
    {
      "contact": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "123-456-7890"
      },
      "summary": "Skilled software engineer with expertise in web development",
      "experience": [
        {
          "company": "Tech Corp",
          "role": "Senior Developer",
          "start": "2020-01",
          "end": "2023-05",
          "bullets": ["Led development team", "Optimized application performance"]
        }
      ],
      "education": [
        {
          "school": "University of Technology",
          "degree": "BS in Computer Science",
          "year": "2019"
        }
      ],
      "skills": ["JavaScript", "React", "Node.js", "TypeScript"]
    }
    \`\`\`

    I hope this helps with your job application!
    `;

    const result = parseWithSchema(ResumeSchema, modelOutput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contact.name).toBe('John Doe');
      expect(result.data.experience[0].company).toBe('Tech Corp');
    }
  });

  it('should handle invalid JSON gracefully', () => {
    const invalidJson = `
    Here's the tailored resume:

    {
      "contact": {
        "name": "John Doe",
        "email": "invalid-email"
      },
      "experience": [
        {
          "company": "Tech Corp",
          "role": "Senior Developer",
          "bullets": ["Led development team"]
          // missing comma here
          "start": "2020-01"
        }
      ]
    }
    `;

    const result = parseWithSchema(ResumeSchema, invalidJson);
    expect(result.ok).toBe(false);
  });
});
