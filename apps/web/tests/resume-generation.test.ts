import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../app/api/resume/generate/route';

// Mock the dependencies
vi.mock('../lib/generators/tailorResume', () => ({
  tailorResume: vi.fn()
}));

vi.mock('../lib/generators/tailorCoverLetter', () => ({
  tailorCoverLetter: vi.fn()
}));

vi.mock('../lib/usage/counter', () => ({
  incrementUsage: vi.fn().mockResolvedValue({ count: 1, limit: 24, remaining: 23 }),
  getUserUsage: vi.fn().mockReturnValue({ count: 1, limit: 24, remaining: 23 }),
  hasReachedLimit: vi.fn().mockReturnValue(false),
  recordGeneration: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../lib/db', () => ({
  prisma: {
    $transaction: async (callback: (tx: any) => Promise<any>) => {
      return await callback({
        usageCounter: {
          upsert: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([])
        },
        generation: {
          create: vi.fn().mockResolvedValue({})
        }
      });
    }
  }
}));

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid')
}));

// Import the mocked modules
import { tailorResume } from '../lib/generators/tailorResume';
import { tailorCoverLetter } from '../lib/generators/tailorCoverLetter';

describe('Resume Generation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle successful generation', async () => {
    // Mock successful responses
    (tailorResume as any).mockResolvedValue({
      result: { summary: 'Test summary', experience: [] },
      provider: 'openai',
      model: 'gpt-4',
      tokenUsage: { inputTokens: 100, outputTokens: 200 }
    });

    (tailorCoverLetter as any).mockResolvedValue({
      result: { header: { applicant: 'John Doe', contact: 'john@example.com', date: '2023-06-01' }, greeting: 'Dear Hiring Manager', body: ['Test paragraph'], closing: 'Sincerely', signature: 'John Doe' },
      provider: 'openai',
      model: 'gpt-4',
      tokenUsage: { inputTokens: 150, outputTokens: 250 }
    });

    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/resume/generate', {
      method: 'POST',
      body: JSON.stringify({
        requested: { provider: 'openai', model: 'gpt-4' },
        masterResume: { summary: 'Original summary', experience: [] },
        applicantProfile: { name: 'John Doe' },
        jobDescription: 'Test job description'
      })
    });

    // Call the API
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.provider.resume.provider).toBe('openai');
    expect(data.provider.coverLetter.provider).toBe('openai');
  });

  it('should handle invalid JSON from AI provider', async () => {
    // Mock a failed response with JSON parsing error
    (tailorResume as any).mockRejectedValue({
      code: 'LLM_JSON_PARSE_FAILED',
      message: 'Failed to parse JSON response',
      preview: 'Invalid JSON content',
      provider: 'google',
      model: 'gemini-1.5-pro'
    });

    // Create a mock request
    const request = new NextRequest('http://localhost:3000/api/resume/generate', {
      method: 'POST',
      body: JSON.stringify({
        requested: { provider: 'google', model: 'gemini-1.5-pro' },
        masterResume: { summary: 'Original summary', experience: [] },
        applicantProfile: { name: 'John Doe' },
        jobDescription: 'Test job description'
      })
    });

    // Call the API
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(422);
    expect(data.error).toBe('TAILORING_FAILED');
    expect(data.stage).toBe('resume');
    expect(data.provider).toBe('google');
  });

  it('should handle missing required fields', async () => {
    // Create a mock request with missing job description
    const request = new NextRequest('http://localhost:3000/api/resume/generate', {
      method: 'POST',
      body: JSON.stringify({
        requested: { provider: 'openai', model: 'gpt-4' },
        masterResume: { summary: 'Original summary', experience: [] },
        applicantProfile: { name: 'John Doe' }
        // Missing jobDescription
      })
    });

    // Call the API
    const response = await POST(request);
    const data = await response.json();

    // Verify the response
    expect(response.status).toBe(400);
    expect(data.error).toBe('MISSING_JD');
  });
});
