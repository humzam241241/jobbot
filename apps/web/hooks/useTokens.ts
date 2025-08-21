import { useState, useEffect } from 'react';
import { useLocalStorage } from 'react-use';

const MAX_TOKENS = 30; // Maximum number of generations allowed per day
const TOKEN_STORAGE_KEY = 'jobbot-tokens-remaining';

export function useTokens() {
  const [tokensRemaining, setTokensRemaining] = useLocalStorage<number>(TOKEN_STORAGE_KEY, MAX_TOKENS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No longer resetting tokens daily - tokens are based purely on usage count
  useEffect(() => {
    // Initialize tokens if not already set
    const generationCount = localStorage.getItem('jobbot-generation-count');
    const usedTokens = generationCount ? parseInt(generationCount, 10) : 0;
    const remainingTokens = MAX_TOKENS - usedTokens;
    
    if (remainingTokens !== tokensRemaining) {
      setTokensRemaining(remainingTokens);
      localStorage.setItem(TOKEN_STORAGE_KEY, remainingTokens.toString());
    }
  }, [tokensRemaining, setTokensRemaining]);

  const useToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentTokens = tokensRemaining || 0;
      
      if (currentTokens <= 0) {
        throw new Error('No tokens remaining. Please try again tomorrow.');
      }

      // Deduct one token and force immediate update
      const newTokenCount = Math.max(0, currentTokens - 1);
      setTokensRemaining(newTokenCount);
      
      // Force localStorage update
      localStorage.setItem(TOKEN_STORAGE_KEY, newTokenCount.toString());
      
      console.log(`Token used. Remaining: ${newTokenCount}/${MAX_TOKENS}`);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getTokensRemaining = () => {
    // Force read from localStorage to ensure we have the latest value
    const storedValue = localStorage.getItem(TOKEN_STORAGE_KEY);
    return storedValue ? parseInt(storedValue, 10) : MAX_TOKENS;
  };

  return {
    tokensRemaining: getTokensRemaining(),
    useToken,
    isLoading,
    error,
    maxTokens: MAX_TOKENS
  };
}
