import { describe, it, expect } from 'vitest';
import { computeAtsScore } from '@/lib/ats/analyzer';
import { NormalizedResume } from '@/lib/types/resume';

describe('ATS Analysis', () => {
  const mockResume: NormalizedResume = {
    header: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      location: 'New York, NY',
      links: []
    },
    summary: 'Mechanical engineer with experience in SolidWorks and FEA analysis',
    skills: {
      Design: ['SolidWorks', 'AutoCAD', 'FEA'],
      Programming: ['MATLAB', 'Python'],
      Tools: ['GD&T', 'CFD'],
      Certifications: ['EIT']
    },
    experience: [{
      role: 'Mechanical Engineer',
      organization: 'Tech Corp',
      startDate: 'Jan 2023',
      endDate: 'Present',
      bullets: [
        'Designed components using SolidWorks and performed FEA analysis',
        'Led team of 3 engineers in product development'
      ]
    }],
    projects: [{
      name: 'Drone Design',
      date: 'Jan 2023',
      bullets: [
        'Developed custom flight controller using Arduino',
        'Achieved 40% weight reduction through optimization'
      ]
    }],
    education: [{
      degree: 'BS Mechanical Engineering',
      school: 'Tech University',
      dates: '2019-2023',
      details: ['GPA: 3.8', 'Senior Design Project Lead']
    }]
  };

  const mockJobDescription = `
    We are seeking a Mechanical Engineer with strong experience in:
    - SolidWorks and CAD modeling
    - Finite Element Analysis (FEA)
    - GD&T principles
    - Team leadership
    - MATLAB programming
    
    The ideal candidate will have experience with:
    - Product development
    - Design optimization
    - Technical documentation
    - Arduino/embedded systems
  `;

  it('should calculate accurate match percentage', () => {
    const analysis = computeAtsScore(mockResume, mockJobDescription);
    expect(analysis.matchPercent).toBeGreaterThan(70);
  });

  it('should identify missing keywords', () => {
    const analysis = computeAtsScore(mockResume, mockJobDescription);
    expect(analysis.missingKeywords).toContain('technical documentation');
  });

  it('should provide section-by-section breakdown', () => {
    const analysis = computeAtsScore(mockResume, mockJobDescription);
    expect(analysis.sectionBreakdown).toHaveProperty('skills');
    expect(analysis.sectionBreakdown).toHaveProperty('experience');
    expect(analysis.sectionBreakdown.skills).toBeGreaterThan(0);
  });

  it('should generate actionable suggestions', () => {
    const analysis = computeAtsScore(mockResume, mockJobDescription);
    expect(analysis.suggestions.length).toBeGreaterThan(0);
    expect(analysis.suggestions[0]).toMatch(/consider|add|enhance|improve/i);
  });
});
