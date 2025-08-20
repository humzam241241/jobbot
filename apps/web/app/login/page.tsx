"use client";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { pathOf } from "@/lib/routes";

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  
  // Reset token stats to exactly 30 generations on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const TOKENS_PER_GENERATION = 10000;
      const MAX_GENERATIONS = 30;
      localStorage.setItem("tokenStats", JSON.stringify({
        total: TOKENS_PER_GENERATION * MAX_GENERATIONS,
        used: 0,
        leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS
      }));
    }
    
    // Check for error query parameters and display them
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get("error");
      if (errorParam) {
        if (errorParam === "OAuthAccountNotLinked") {
          setError("This email is already used with a different sign-in method. Please use that method instead.");
        } else if (errorParam === "AccessDenied") {
          setError("Access denied. Please try again or use a different account.");
        } else {
          setError(`Authentication error: ${errorParam}`);
        }
      }
    }
  }, []);

  // Simple redirect check - no automatic redirect to avoid loops
  if (status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
        <div className="text-center">
          <p className="text-lg mb-4">You are already signed in!</p>
          <a href={pathOf("dashboard")} className="text-emerald-400 hover:underline">
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  async function handleGoogle() {
    try {
      setGoogleLoading(true);
      setError(null);
      
      // Simple Google sign-in
      await signIn("google", {
        callbackUrl: pathOf("dashboard"),
        redirect: true
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setError("Failed to sign in with Google. Please try again or use email login.");
      setGoogleLoading(false);
    }
  }

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      if (isSignup) {
        // Handle signup
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.details) {
            setError(data.details.map((d: any) => d.message).join(", "));
          } else {
            setError(data.error || "Signup failed");
          }
          return;
        }

        setSuccess("Account created successfully! You can now sign in.");
        setIsSignup(false);
        (event.target as HTMLFormElement).reset();
      } else {
        // Handle login
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else if (result?.ok) {
          // Successful login will be handled by NextAuth redirect
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-neutral-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-emerald-400">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            {isSignup ? "Join us to start building better resumes" : "Sign in to your account"}
          </p>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 text-center">
            Session Status: {status} | User: {session && status === "authenticated" ? ((session as any)?.user?.email || 'No email') : 'None'}
          </div>
        )}
        
        {registered && (
          <div className="p-3 text-sm text-center bg-emerald-900/50 border border-emerald-500/30 rounded-md">
            Registration successful! Please sign in.
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-center bg-red-900/50 border border-red-500/30 rounded-md text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-center bg-emerald-900/50 border border-emerald-500/30 rounded-md text-emerald-300">
            {success}
          </div>
        )}
        
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-medium">
            {googleLoading ? "Signing in..." : "Choose Google Account"}
          </span>
        </button>
        
        <div className="flex items-center text-xs text-neutral-400">
          <hr className="flex-grow border-neutral-600" />
          <span className="px-3">OR</span>
          <hr className="flex-grow border-neutral-600" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignup && (
            <div>
              <label className="text-sm font-medium text-neutral-300" htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                required={isSignup}
                className="w-full mt-1 px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              className="w-full mt-1 px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-neutral-300" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={isSignup ? "Create a strong password" : "Enter your password"}
              required
              className="w-full mt-1 px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
            {isSignup && (
              <p className="text-xs text-neutral-400 mt-1">
                Must be 8+ characters with uppercase, lowercase, number, and special character
              </p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 px-4 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? "Processing..." : isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {isSignup ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </main>
  );
}