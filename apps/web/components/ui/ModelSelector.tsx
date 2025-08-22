// apps/web/components/ui/ModelSelector.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createDevLogger } from "@/lib/utils/devLogger";

const logger = createDevLogger("ui:modelSelector");

type Provider = 'openai' | 'anthropic' | 'google' | 'auto';

interface Model {
  id: string;
  name: string;
  provider: Provider;
  isLatest?: boolean;
}

interface ProviderInfo {
  available: boolean;
  models: string[];
}

interface ModelSelectorProps {
  defaultProvider?: Provider;
  defaultModel?: string;
  onChange?: (provider: Provider, model: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Component for selecting AI provider and model
 */
export default function ModelSelector({
  defaultProvider = 'auto',
  defaultModel = 'auto',
  onChange,
  className = '',
  disabled = false
}: ModelSelectorProps) {
  const [providers, setProviders] = useState<Record<string, ProviderInfo>>({
    openai: { available: false, models: [] },
    anthropic: { available: false, models: [] },
    google: { available: false, models: [] }
  });
  
  const [selectedProvider, setSelectedProvider] = useState<Provider>(defaultProvider);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch available providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/providers/status');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch providers: ${response.status}`);
        }
        
        const data = await response.json();
        setProviders(data.providers);
        
        // If the default provider is not available, switch to auto or first available
        if (defaultProvider !== 'auto' && !data.providers[defaultProvider]?.available) {
          if (data.anyProviderAvailable) {
            // Find first available provider
            const firstAvailable = Object.entries(data.providers)
              .find(([_, info]) => (info as ProviderInfo).available)?.[0] as Provider;
            
            if (firstAvailable) {
              setSelectedProvider(firstAvailable);
              const firstModel = data.providers[firstAvailable].models[0];
              setSelectedModel(firstModel);
              onChange?.(firstAvailable, firstModel);
              logger.warn(`Default provider ${defaultProvider} not available, switching to ${firstAvailable}`);
            }
          } else {
            setError('No AI providers are configured. Please set up API keys.');
          }
        }
      } catch (err) {
        logger.error('Error fetching providers', err);
        setError('Failed to load AI providers. Using best available.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProviders();
  }, [defaultProvider, defaultModel, onChange]);
  
  // Format model name for display
  function formatModelName(id: string): string {
    // GPT models
    if (id.includes('gpt-4o-2024')) return 'GPT-4o (Latest)';
    if (id.includes('gpt-4o')) return 'GPT-4o';
    if (id.includes('gpt-4-turbo')) return 'GPT-4 Turbo';
    if (id.includes('gpt-4')) return 'GPT-4';
    if (id.includes('gpt-3.5')) return 'GPT-3.5 Turbo';
    
    // Claude models
    if (id.includes('claude-3-5')) return 'Claude 3.5 Sonnet (Latest)';
    if (id.includes('claude-3-opus')) return 'Claude 3 Opus';
    if (id.includes('claude-3-sonnet')) return 'Claude 3 Sonnet';
    if (id.includes('claude-3-haiku')) return 'Claude 3 Haiku';
    if (id.includes('claude-2.1')) return 'Claude 2.1';
    
    // Gemini models
    if (id.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro (Latest)';
    if (id.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
    if (id.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (id.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    if (id.includes('gemini-1.0')) return 'Gemini 1.0 Pro';
    
    // Default: return the ID with first letter capitalized
    return id.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }
  
  // Handle provider change
  const handleProviderChange = (provider: Provider) => {
    setSelectedProvider(provider);
    
    // If switching to auto, set model to auto
    if (provider === 'auto') {
      setSelectedModel('auto');
      onChange?.('auto', 'auto');
      return;
    }
    
    // Otherwise, select the first available model from the provider
    const providerInfo = providers[provider];
    if (providerInfo?.available && providerInfo.models.length > 0) {
      const model = providerInfo.models[0];
      setSelectedModel(model);
      onChange?.(provider, model);
    }
  };
  
  // Handle model change
  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const model = event.target.value;
    setSelectedModel(model);
    onChange?.(selectedProvider, model);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-200">
          AI Provider
        </label>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            disabled={disabled}
            className={`p-2 rounded-md text-center ${
              disabled ? 'opacity-50 cursor-not-allowed bg-gray-800' :
              selectedProvider === 'auto'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300'
            }`}
            onClick={() => handleProviderChange('auto')}
          >
            Auto (Best)
          </button>
          
          {['openai', 'anthropic', 'google'].map((provider) => (
            <button
              key={provider}
              type="button"
              disabled={disabled || !providers[provider]?.available}
              className={`p-2 rounded-md text-center ${
                disabled ? 'opacity-50 cursor-not-allowed bg-gray-800' :
                selectedProvider === provider
                  ? 'bg-emerald-600 text-white'
                  : !providers[provider]?.available
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300'
              }`}
              onClick={() => handleProviderChange(provider as Provider)}
              title={!providers[provider]?.available ? `${provider === 'google' ? 'GOOGLE_API_KEY' : `${provider.toUpperCase()}_API_KEY`} not set` : undefined}
            >
              {provider === 'openai' ? 'OpenAI' :
               provider === 'anthropic' ? 'Anthropic' : 
               provider === 'google' ? 'Google' : provider}
            </button>
          ))}
        </div>
      </div>
      
      {selectedProvider !== 'auto' && (
        <div className="space-y-2">
          <label htmlFor="model-select" className="block text-sm font-medium text-gray-200">
            Model
          </label>
          <select
            id="model-select"
            name="model"
            value={selectedModel}
            onChange={handleModelChange}
            disabled={disabled || !providers[selectedProvider]?.available}
            className={`block w-full rounded-md bg-gray-800 border border-gray-700 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm ${
              disabled || !providers[selectedProvider]?.available ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {providers[selectedProvider]?.models.map(model => (
              <option key={model} value={model}>
                {formatModelName(model)}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      
      {/* Hidden input to store the selected model for form submission */}
      <input type="hidden" name="model" value={selectedModel} />
      <input type="hidden" name="provider" value={selectedProvider} />
    </div>
  );
}