'use client';

import { createContext, useContext, useState } from 'react';

interface AuthContextType {
  credits: number;
  decrementCredits: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  credits: 30,
  decrementCredits: () => {},
  isLoading: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState(30);
  const [isLoading, setIsLoading] = useState(false);

  const decrementCredits = () => {
    setCredits(prev => Math.max(0, prev - 1));
  };

  return (
    <AuthContext.Provider value={{ credits, decrementCredits, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}