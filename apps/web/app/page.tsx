"use client";
import Link from "next/link";
import { Github, FileText, Bot } from "lucide-react";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { pathOf } from "@/lib/routes";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Always sign out when landing on the home page to ensure a fresh start
    
    // Reset token stats to exactly 30 generations
    if (typeof window !== "undefined") {
      const TOKENS_PER_GENERATION = 10000;
      const MAX_GENERATIONS = 30;
      localStorage.setItem("tokenStats", JSON.stringify({
        total: TOKENS_PER_GENERATION * MAX_GENERATIONS,
        used: 0,
        leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS
      }));
    }
    
    if (status === "authenticated" && session) {
      // Clear all auth-related storage
      localStorage.removeItem('generatedKit');
      sessionStorage.clear();
      
      // Clear auth cookies
      document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // Use NextAuth signOut with redirect
      signOut({ callbackUrl: pathOf("login"), redirect: true });
    }
  }, [status, session]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#0b1220] text-white">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tighter">Welcome to JobBot</h1>
        <p className="text-lg text-neutral-400">
          Your AI-powered copilot for creating ATS-optimized application materials.
        </p>
        <Link href={pathOf("login")} className="mt-3 inline-block rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20">
          Login
        </Link>
      </div>
    </main>
  )
}

