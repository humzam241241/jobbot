"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NAV_ITEMS } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Filter items based on user role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) {
      return (session?.user as any)?.role === "ADMIN";
    }
    return true;
  });

  return (
    <nav aria-label="Primary" className="space-y-2">
      {visibleItems.map(({ href, label, icon }) => {
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl border border-slate-800 px-3 py-2 transition will-change-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active? 'bg-slate-900 text-indigo-300' : 'bg-slate-900/40 hover:bg-slate-900'}`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


