import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../app/api/generate-resume-kit/route';

// Mock the generateResumeKit function
vi.mock('../lib/ai/orchestrator', () => ({
  generateResumeKit: vi.fn().mockResolvedValue({
    ok: true,
    partial: false,
    artifacts: {
      coverLetterMd: '# Cover Letter\n\nThis is a test cover letter.',
      resumeMd: '# Resume\n\nThis is a test resume.',
      pdfs: [],
    },
    usedProvider: 'test-provider',
  }),
}));

// Mock the renderMarkdownToPDF function
vi.mock('../lib/artifacts', () => ({
  renderMarkdownToPDF: vi.fn().mockResolvedValue(Buffer.from('test-pdf-content')),
  saveFile: vi.fn().mockImplementation((content: Buffer | string, options: { name: string }) => ({
    url: `http://localhost:3000/generated/test/${options.name}`,
    name: options.name,
  })),
}));

// Mock NextAuth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
  }),
}));

describe('Generate Resume Kit API', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    // Create a mock request
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        jobDescription: {
          jobDescriptionText: 'This is a test job description.',
        },
        providerPreference: 'auto',
      }),
      nextUrl: {
        pathname: '/api/generate-resume-kit',
      },
    } as unknown as NextRequest;
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  it('should return a successful response with artifacts', async () => {
    // Call the API handler
    const response = await POST(mockRequest);
    
    // Verify the response
    expect(response).toBeInstanceOf(NextResponse);
    
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.artifacts).toBeDefined();
    expect(json.artifacts.pdfs).toBeInstanceOf(Array);
    expect(json.usedProvider).toBe('test-provider');
    expect(json.processingTime).toBeGreaterThanOrEqual(0);
    expect(json.timestamp).toBeDefined();
  });
  
  it('should handle validation errors', async () => {
    // Create a mock request with invalid data
    const invalidRequest = {
      ...mockRequest,
      json: vi.fn().mockResolvedValue({
        // Missing jobDescription
        providerPreference: 'auto',
      }),
    } as unknown as NextRequest;
    
    // Call the API handler
    const response = await POST(invalidRequest);
    
    // Verify the response
    expect(response).toBeInstanceOf(NextResponse);
    
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('VALIDATION');
    expect(json.message).toBeDefined();
  });
});