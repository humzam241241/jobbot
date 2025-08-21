import { useState, useEffect } from 'react';
import { useLocalStorage } from 'react-use';

const MAX_TOKENS = 30;
const TOKEN_STORAGE_KEY = 'jobbot-tokens-remaining';

export function useTokens() {
  const [tokensRemaining, setTokensRemaining] = useLocalStorage(TOKEN_STORAGE_KEY, MAX_TOKENS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset tokens at midnight
  useEffect(() => {
    const checkDate = () => {
      const lastResetDate = localStorage.getItem('jobbot-last-reset-date');
      const today = new Date().toDateString();
      
      if (lastResetDate !== today) {
        setTokensRemaining(MAX_TOKENS);
        localStorage.setItem('jobbot-last-reset-date', today);
      }
    };

    checkDate(); // Check on mount
    
    // Check every minute
    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, [setTokensRemaining]);

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

  const getTokensRemaining = () => tokensRemaining || 0;

  return {
    tokensRemaining: getTokensRemaining(),
    useToken,
    isLoading,
    error,
    maxTokens: MAX_TOKENS
  };
}
