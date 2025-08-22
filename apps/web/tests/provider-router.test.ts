// apps/web/tests/provider-router.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveProvider, ProviderRequest } from '../lib/llm/providers';

// Mock the env module
vi.mock('../lib/env', () => ({
  env: {
    hasOpenAI: true,
    hasAnthropic: false,
    hasGemini: false,
  }
}));

describe('Provider Router', () => {
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    // Mock console.warn to avoid polluting test output
    console.warn = vi.fn();
  });
  
  afterEach(() => {
    // Restore original console.warn
    console.warn = originalConsoleWarn;
  });
  
  it('should use requested provider if available', () => {
    // Mock env with OpenAI available
    vi.mocked(require('../lib/env').env).hasOpenAI = true;
    vi.mocked(require('../lib/env').env).hasAnthropic = false;
    vi.mocked(require('../lib/env').env).hasGemini = false;
    
    const request: ProviderRequest = {
      requested: { provider: 'openai', model: 'gpt-4' },
      purpose: 'resume-tailor'
    };
    
    const result = resolveProvider(request);
    
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4');
  });
  
  it('should fall back to available provider if requested is not available', () => {
    // Mock env with only Anthropic available
    vi.mocked(require('../lib/env').env).hasOpenAI = false;
    vi.mocked(require('../lib/env').env).hasAnthropic = true;
    vi.mocked(require('../lib/env').env).hasGemini = false;
    
    const request: ProviderRequest = {
      requested: { provider: 'openai', model: 'gpt-4' },
      purpose: 'resume-tailor'
    };
    
    const result = resolveProvider(request);
    
    // Should fall back to Anthropic
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3-5-sonnet-latest');
    expect(console.warn).toHaveBeenCalled();
  });
  
  it('should use first available provider when no preference is specified', () => {
    // Mock env with only Gemini available
    vi.mocked(require('../lib/env').env).hasOpenAI = false;
    vi.mocked(require('../lib/env').env).hasAnthropic = false;
    vi.mocked(require('../lib/env').env).hasGemini = true;
    
    const request: ProviderRequest = {
      purpose: 'resume-tailor'
    };
    
    const result = resolveProvider(request);
    
    // Should use Gemini
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-2.5-pro');
  });
  
  it('should throw error when no providers are configured', () => {
    // Mock env with no providers available
    vi.mocked(require('../lib/env').env).hasOpenAI = false;
    vi.mocked(require('../lib/env').env).hasAnthropic = false;
    vi.mocked(require('../lib/env').env).hasGemini = false;
    
    const request: ProviderRequest = {
      purpose: 'resume-tailor'
    };
    
    expect(() => {
      resolveProvider(request);
    }).toThrow('No LLM providers are configured');
  });
});