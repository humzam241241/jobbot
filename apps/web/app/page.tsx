"use client";
import Link from "next/link";
import { Github, FileText, Bot } from "lucide-react";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { pathOf } from "@/lib/routes";

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Reset token stats to exactly 30 generations if they don't exist
    if (typeof window !== "undefined" && !localStorage.getItem("tokenStats")) {
      const TOKENS_PER_GENERATION = 10000;
      const MAX_GENERATIONS = 30;
      localStorage.setItem("tokenStats", JSON.stringify({
        total: TOKENS_PER_GENERATION * MAX_GENERATIONS,
        used: 0,
        leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS
      }));
    }
    
    // If authenticated, redirect to dashboard
    if (status === "authenticated" && session) {
      window.location.href = pathOf("dashboard");
    }
  }, [status, session]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#0b1220] text-white">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tighter">Welcome to JobBot</h1>
        <p className="text-lg text-neutral-400">
          Your AI-powered copilot for creating ATS-optimized application materials.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href={pathOf("login")} className="mt-3 inline-block rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors">
            Login
          </Link>
          <Link href={pathOf("signup")} className="mt-3 inline-block rounded-xl border border-purple-500 px-6 py-3 text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  )
}

