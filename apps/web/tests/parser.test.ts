import { describe, it, expect } from 'vitest';
import { normalizeResume } from '@/lib/parser/resumeParser';

describe('Resume Parser', () => {
  const sampleResumeText = `
John Doe
john@example.com | 123-456-7890 | New York, NY
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Mechanical engineer specializing in product development and design optimization.

TECHNICAL SKILLS
Design: SolidWorks, AutoCAD, Fusion 360
Programming: MATLAB, Python, C++
Tools: GD&T, FEA, CFD
Certifications: EIT, CSWA

PROFESSIONAL EXPERIENCE
Mechanical Design Engineer | Tech Corp | Jan 2023 - Present
• Led development of new product line using SolidWorks and FEA
• Reduced manufacturing costs by 30% through design optimization
• Managed team of 3 junior engineers on various projects

PROJECTS
Autonomous Drone | Jan 2023
• Designed and built custom flight controller using Arduino
• Achieved 40% weight reduction through iterative optimization
• Implemented computer vision for autonomous navigation

EDUCATION
Bachelor of Science in Mechanical Engineering | Tech University | 2019-2023
• GPA: 3.8/4.0
• Senior Design Project Lead
• Dean's List all semesters
`;

  it('should extract contact information correctly', () => {
    const result = normalizeResume(sampleResumeText);
    expect(result.header.name).toBe('John Doe');
    expect(result.header.email).toBe('john@example.com');
    expect(result.header.phone).toBe('123-456-7890');
    expect(result.header.location).toBe('New York, NY');
    expect(result.header.links).toHaveLength(2);
  });

  it('should parse skills into categories', () => {
    const result = normalizeResume(sampleResumeText);
    expect(result.skills).toHaveProperty('Design');
    expect(result.skills.Design).toContain('SolidWorks');
    expect(result.skills.Programming).toContain('MATLAB');
  });

  it('should parse experience with bullets', () => {
    const result = normalizeResume(sampleResumeText);
    expect(result.experience).toHaveLength(1);
    expect(result.experience[0].role).toBe('Mechanical Design Engineer');
    expect(result.experience[0].organization).toBe('Tech Corp');
    expect(result.experience[0].bullets).toHaveLength(3);
  });

  it('should parse projects section', () => {
    const result = normalizeResume(sampleResumeText);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe('Autonomous Drone');
    expect(result.projects[0].bullets).toHaveLength(3);
  });

  it('should parse education section', () => {
    const result = normalizeResume(sampleResumeText);
    expect(result.education).toHaveLength(1);
    expect(result.education[0].degree).toBe('Bachelor of Science in Mechanical Engineering');
    expect(result.education[0].school).toBe('Tech University');
    expect(result.education[0].details).toHaveLength(3);
  });
});
