'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { User } from '@/types';
import { apiGet } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  credits: number;
  maxCredits: number;
  updateCredits: (credits: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  credits: 30,
  maxCredits: 30,
  updateCredits: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      apiGet<User>('/api/user')
        .then(userData => {
          // Ensure user has at least 30 credits
          const updatedUser = {
            ...userData,
            credits: userData.credits || 30,
            maxCredits: userData.maxCredits || 30
          };
          setUser(updatedUser);
        })
        .catch(setError);
    }
  }, [session, status]);

  const updateCredits = (newCredits: number) => {
    if (user) {
      setUser({ ...user, credits: newCredits });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: status === 'loading',
        error,
        credits: user?.credits || 30,
        maxCredits: user?.maxCredits || 30,
        updateCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}