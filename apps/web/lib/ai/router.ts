import { createLogger } from '@/lib/logger';
import { GoogleProvider } from './providers/google';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { AIProvider } from './types';

const logger = createLogger('model-router');

/**
 * Routes requests to the appropriate AI provider based on user selection
 */
export function modelRouter(provider: string = 'auto', model: string = 'default'): AIProvider {
  logger.info('Routing to AI provider', { provider, model });
  
  // Validate provider
  const validProvider = validateProvider(provider);
  
  // Handle auto-routing
  if (validProvider === 'auto') {
    return autoSelectProvider(model);
  }
  
  // Route to specific provider
  switch (validProvider) {
    case 'google':
      return new GoogleProvider(model);
    case 'openai':
      return new OpenAIProvider(model);
    case 'anthropic':
      return new AnthropicProvider(model);
    default:
      logger.warn('Unknown provider, falling back to OpenAI', { provider });
      return new OpenAIProvider('gpt-4o');
  }
}

/**
 * Validates and normalizes provider name
 */
function validateProvider(provider: string): string {
  const normalized = provider.toLowerCase().trim();
  
  // Map provider aliases
  const providerMap: Record<string, string> = {
    'auto': 'auto',
    'google': 'google',
    'gemini': 'google',
    'openai': 'openai',
    'gpt': 'openai',
    'anthropic': 'anthropic',
    'claude': 'anthropic',
  };
  
  return providerMap[normalized] || 'auto';
}

/**
 * Automatically selects the best provider based on the task
 */
function autoSelectProvider(model: string): AIProvider {
  // Default to OpenAI for best overall performance
  if (model === 'default') {
    logger.info('Auto-selecting OpenAI provider');
    return new OpenAIProvider('gpt-4o');
  }
  
  // If model is specified, try to match to a provider
  if (model.includes('gpt') || model.includes('openai')) {
    return new OpenAIProvider(model);
  }
  
  if (model.includes('gemini') || model.includes('google')) {
    return new GoogleProvider(model);
  }
  
  if (model.includes('claude') || model.includes('anthropic')) {
    return new AnthropicProvider(model);
  }
  
  // Default fallback
  logger.info('No specific provider match, using OpenAI');
  return new OpenAIProvider('gpt-4o');
}
