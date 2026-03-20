'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
// import { Logo } from '@/components/ui/Logo'; // Not needed, using direct img tag
import { Mail } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
          <div className="mt-4 text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      console.log('User already authenticated, redirecting to dashboard');
      const targetUrl = searchParams?.get('from') || '/dashboard';
      router.replace(targetUrl); // Use replace to avoid adding to history
    }
  }, [status, router, searchParams]);

  // Debug logging
  useEffect(() => {
    console.log('Login page - Session status:', status);
  }, [status]);

  // Removed aggressive cookie clearing that could break NextAuth handshake

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const callbackUrl = searchParams?.get('from') || '/dashboard';
      console.log('Starting Google sign-in with callback:', callbackUrl);
      
      const result = await signIn('google', { 
        callbackUrl, 
        redirect: false, // Don't auto-redirect, handle manually
        prompt: 'consent',
        // Request minimal scopes on initial sign-in to avoid OAuthCallback failures.
        // Drive scopes are requested later only when needed by the Drive picker.
        scope: 'openid email profile',
        access_type: 'offline',
        response_type: 'code'
      });
      
      console.log('Google sign-in result:', result);
      
      if (result?.error) {
        console.error('Sign-in error:', result.error);
        setIsLoading(false);
        return;
      }
      
      if (result?.url) {
        console.log('Redirecting to:', result.url);
        router.push(result.url);
      } else {
        console.log('No URL returned, redirecting to dashboard');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const callbackUrl = searchParams?.get('from') || '/dashboard';
      
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.url) {
        router.push(result.url);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Email sign in error:', error);
      setIsLoading(false);
    }
  };

  // Show loading state while checking session (but timeout after 3 seconds)
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (status === 'loading') {
      const timer = setTimeout(() => {
        setShowLoadingTimeout(true);
        console.log('Session loading timeout - forcing login form display');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'loading' && !showLoadingTimeout) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-center">
          <img 
            src="/jobbot%20logo%20.png" 
            alt="JobBot Logo" 
            className="h-24 w-24 object-contain mx-auto mb-4"
            onError={(e) => {
              console.error('Logo loading error:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
          <div className="mt-4 text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center">
          <img 
            src="/jobbot%20logo%20.png" 
            alt="JobBot Logo" 
            className="w-full max-w-[400px] h-auto object-contain mb-4"
            onError={(e) => {
              console.error('Logo loading error:', e);
              // Fallback to text if logo fails
              const fallback = document.createElement('div');
              fallback.className = 'w-24 h-24 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4';
              fallback.textContent = '🤖';
              e.currentTarget.parentNode?.replaceChild(fallback, e.currentTarget);
            }}
          />
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            JobBot
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your AI-powered resume assistant
          </p>
          
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-400">
              Session: {status} | Loading timeout: {showLoadingTimeout ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-gray-200">
          {/* Force login form to show if session is still loading after timeout */}
          {!showEmailForm ? (
            <div className="space-y-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="h-5 w-5 mr-2"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
                {isLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <button
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00E5A0] hover:bg-[#00E5A0]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-5 w-5 mr-2" />
                Sign in with Email
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00E5A0] focus:border-[#00E5A0] sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00E5A0] focus:border-[#00E5A0] sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isLoading}
                  className="text-sm font-medium text-[#00E5A0] hover:text-[#00E5A0]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back to options
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00E5A0] hover:bg-[#00E5A0]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00E5A0] disabled:opacity-50 disabled:cursor-not-allowed"
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