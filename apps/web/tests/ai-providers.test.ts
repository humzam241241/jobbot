import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { OpenAIProvider } from '../lib/ai/providers/openai';
import { AnthropicProvider } from '../lib/ai/providers/anthropic';
import { GoogleProvider } from '../lib/ai/providers/google';
import { AIProviderError } from '../lib/ai/providers/types';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: '{"test": "value"}',
                },
              },
            ],
            usage: {
              total_tokens: 100,
            },
          }),
        },
      },
    })),
  };
});

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              text: '{"test": "value"}',
            },
          ],
          usage: {
            input_tokens: 50,
            output_tokens: 50,
          },
        }),
      },
    })),
  };
});

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => '{"test": "value"}',
            usageMetadata: {
              totalTokens: 100,
            },
          },
        }),
      }),
    })),
  };
});

describe('AI Provider Adapters', () => {
  // Test schema
  const testSchema = z.object({
    test: z.string(),
  });
  
  // Test input
  const testInput = {
    prompt: 'Test prompt',
    schema: testSchema,
  };
  
  describe('OpenAI Provider', () => {
    let provider: OpenAIProvider;
    
    beforeEach(() => {
      // Mock environment
      process.env.OPENAI_API_KEY = 'test-key';
      
      // Create provider
      provider = new OpenAIProvider();
    });
    
    it('should initialize correctly with API key', () => {
      expect(provider.available()).toBe(true);
    });
    
    it('should not be available without API key', () => {
      delete process.env.OPENAI_API_KEY;
      const noKeyProvider = new OpenAIProvider();
      expect(noKeyProvider.available()).toBe(false);
    });
    
    it('should generate content successfully', async () => {
      const result = await provider.generate(testInput);
      
      expect(result.json).toEqual({ test: 'value' });
      expect(result.tokensUsed).toBe(100);
    });
  });
  
  describe('Anthropic Provider', () => {
    let provider: AnthropicProvider;
    
    beforeEach(() => {
      // Mock environment
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      // Create provider
      provider = new AnthropicProvider();
    });
    
    it('should initialize correctly with API key', () => {
      expect(provider.available()).toBe(true);
    });
    
    it('should not be available without API key', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const noKeyProvider = new AnthropicProvider();
      expect(noKeyProvider.available()).toBe(false);
    });
    
    it('should generate content successfully', async () => {
      const result = await provider.generate(testInput);
      
      expect(result.json).toEqual({ test: 'value' });
      expect(result.tokensUsed).toBe(100);
    });
  });
  
  describe('Google Provider', () => {
    let provider: GoogleProvider;
    
    beforeEach(() => {
      // Mock environment
      process.env.GOOGLE_API_KEY = 'test-key';
      
      // Create provider
      provider = new GoogleProvider();
    });
    
    it('should initialize correctly with API key', () => {
      expect(provider.available()).toBe(true);
    });
    
    it('should not be available without API key', () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const noKeyProvider = new GoogleProvider();
      expect(noKeyProvider.available()).toBe(false);
    });
    
    it('should generate content successfully', async () => {
      const result = await provider.generate(testInput);
      
      expect(result.json).toEqual({ test: 'value' });
      expect(result.tokensUsed).toBe(100);
    });
  });
  
  describe('Error Handling', () => {
    let provider: OpenAIProvider;
    
    beforeEach(() => {
      // Mock environment
      process.env.OPENAI_API_KEY = 'test-key';
      
      // Create provider
      provider = new OpenAIProvider();
      
      // Mock the client to throw an error
      vi.mocked(provider.client!.chat.completions.create).mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded',
      });
    });
    
    it('should handle rate limit errors', async () => {
      await expect(provider.generate(testInput)).rejects.toThrow(AIProviderError);
      await expect(provider.generate(testInput)).rejects.toMatchObject({
        code: 'RATE_LIMIT',
      });
    });
  });
});
