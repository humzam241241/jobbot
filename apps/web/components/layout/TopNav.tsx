"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X, LogOut, Gauge } from "lucide-react";
import { pathOf } from "@/lib/routes";
import Image from "next/image";
import { useLocalStorage } from "react-use";
import { NAV_ITEMS, NavItem } from "./nav-links";

// Token monitoring interface
interface TokenStats {
  total: number;
  used: number;
  leftover: number;
}

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Token monitoring state - limited to exactly 30 generations
  const MAX_GENERATIONS = 30;
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    total: MAX_GENERATIONS,
    used: 0,
    leftover: MAX_GENERATIONS
  });
  
  // Read token usage from localStorage
  useEffect(() => {
    const updateTokenStats = () => {
      try {
        // Read generation count
        const generationCount = localStorage.getItem('jobbot-generation-count');
        const usedTokens = generationCount ? parseInt(generationCount, 10) : 0;
        
        // Read remaining tokens
        const remainingTokens = localStorage.getItem('jobbot-tokens-remaining');
        const tokensLeft = remainingTokens ? parseInt(remainingTokens, 10) : MAX_GENERATIONS;
        
        setTokenStats({
          total: MAX_GENERATIONS,
          used: usedTokens,
          leftover: tokensLeft
        });
      } catch (error) {
        console.error('Error reading token stats:', error);
      }
    };
    
    // Update immediately and then every second
    updateTokenStats();
    const interval = setInterval(updateTokenStats, 1000);
    
    // Add storage event listener to detect changes from other tabs
    const handleStorageChange = () => updateTokenStats();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Filter items based on user role
  const visibleItems = NAV_ITEMS.filter((item: NavItem) => {
    if (item.adminOnly) {
      return (session?.user as any)?.role === "ADMIN";
    }
    return true;
  });

  const handleSignOut = async () => {
    // Clear only NextAuth related items
    localStorage.removeItem('generatedKit');
    
    // Clear NextAuth cookies
    document.cookie = "next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Use NextAuth signOut
    await signOut({ 
      callbackUrl: pathOf("login"),
      redirect: true 
    });
  };

  return (
    <div data-testid="top-nav" className="navbar sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={pathOf("dashboard")} className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="JobBot Logo"
              width={24}
              height={24}
              className="h-6 w-6 rounded-lg"
            />
            <span className="font-semibold text-lg">JobBot</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {visibleItems.map((it: NavItem) => {
              const active = pathname?.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "navbar-link inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    active ? "active" : "",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {it.icon}{it.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Token Monitoring UI */}
          {session?.user && (
            <Link href={pathOf("tokens")} className="hidden md:flex h-10 items-center gap-1 bg-neutral-800/50 rounded-xl border border-neutral-700 hover:bg-neutral-700/50 transition-colors">
              <div className="flex items-center h-full px-3 rounded-l-xl bg-blue-600/20 text-blue-400 border-r border-neutral-700">
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium">Total</span>
                  <span className="text-sm font-semibold">{MAX_GENERATIONS}</span>
                </div>
              </div>
              <div className="flex items-center h-full px-3 bg-amber-600/20 text-amber-400 border-r border-neutral-700">
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium">Used</span>
                  <span className="text-sm font-semibold">{tokenStats?.used || 0}</span>
                </div>
              </div>
              <div className="flex items-center h-full px-3 rounded-r-xl bg-emerald-600/20 text-emerald-400">
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-medium">Left</span>
                  <span className="text-sm font-semibold">{tokenStats?.leftover || 0}</span>
                </div>
              </div>
            </Link>
          )}
          
          {/* Token indicator for mobile */}
          {session?.user && (
            <Link 
              href={pathOf("tokens")}
              className="md:hidden inline-flex items-center h-10 gap-1 rounded-xl px-3 text-sm border border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors"
              title="Generations Left"
            >
              <Gauge className="h-4 w-4 text-emerald-400" />
              <span>{tokenStats?.leftover || 0}</span>
            </Link>
          )}
          
          {/* Sign Out Button */}
          {session?.user && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border transition hover:bg-slate-900/60 text-slate-300 border-transparent"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-2 grid grid-cols-1 gap-2">
            {visibleItems.map((it: NavItem) => {
              const active = pathname?.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border",
                    active ? "bg-indigo-600/15 text-indigo-300 border-slate-800" : "hover:bg-slate-900/60 border-slate-800",
                  ].join(" ")}
                  onClick={() => setOpen(false)}
                >
                  {it.icon}{it.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


