'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { FcGoogle } from 'react-icons/fc';
import { HiMail } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Force logout on mount
  useEffect(() => {
    const forceLogout = async () => {
      try {
        await signOut({ redirect: false });
        localStorage.removeItem('next-auth.session-token');
        localStorage.removeItem('next-auth.callback-url');
        localStorage.removeItem('next-auth.csrf-token');
        document.cookie.split(';').forEach(c => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    forceLogout();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await signIn('google', {
        callbackUrl: '/dashboard',
        redirect: false,
        prompt: 'select_account consent'
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to sign in with Google');
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to sign in');
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="xl" className="mb-4" />
        </div>
        <p className="mt-2 text-center text-xl text-gray-400">
          Your AI-powered resume assistant
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!showEmailForm ? (
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FcGoogle className="h-5 w-5 mr-2" />
                Sign in with Google
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00E5A0] hover:bg-[#00E5A0]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0]"
              >
                <HiMail className="h-5 w-5 mr-2" />
                Sign in with Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00E5A0] focus:border-[#00E5A0] sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00E5A0] focus:border-[#00E5A0] sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-sm text-[#00E5A0] hover:text-[#00E5A0]/90"
                >
                  Back
                </button>
                <div className="text-sm">
                  <a href="/signup" className="font-medium text-[#00E5A0] hover:text-[#00E5A0]/90">
                    Create an account
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00E5A0] hover:bg-[#00E5A0]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0]"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}