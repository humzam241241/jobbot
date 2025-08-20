"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NAV_ITEMS } from "./nav";
import { useState, useEffect, useRef } from "react";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement|null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    function onKey(e: KeyboardEvent){ if(e.key==='Escape') setOpen(false) }
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, []);

  // Filter items based on user role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) {
      return (session?.user as any)?.role === "ADMIN";
    }
    return true;
  });

  const primaryHrefs = ["/dashboard","/jobbot","/applications","/library"];
  const primary = visibleItems.filter(i=> primaryHrefs.includes(i.href)).sort((a,b)=> primaryHrefs.indexOf(a.href)-primaryHrefs.indexOf(b.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-[#0b1220]/95 backdrop-blur lg:hidden" role="navigation" aria-label="Bottom">
      <div className="mx-auto grid max-w-6xl grid-cols-5">
        {primary.slice(0, 4).map(({ href, icon, label }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link key={href} href={href} className="flex h-11 flex-col items-center justify-center gap-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <div className={active ? "text-indigo-400" : "text-slate-400"}>
                {icon}
              </div>
              <span className={active ? "text-indigo-400" : "text-slate-400"}>{label}</span>
            </Link>
          );
        })}
        {/* More */}
        <button aria-label="More" onClick={()=>setOpen(true)} className="flex h-11 flex-col items-center justify-center gap-1 text-xs text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">⋯</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={()=>setOpen(false)} aria-hidden="true" />
      )}
      {open && (
        <div ref={panelRef} role="dialog" aria-modal="true" aria-label="More" className="fixed inset-x-0 bottom-14 z-50 mx-auto w-full max-w-6xl px-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-3 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {visibleItems.filter(i=> ["/scraper","/settings","/file-manager","/admin/users"].includes(i.href)).map(({ href, icon, label })=>{
                return (
                  <Link key={href} href={href} onClick={()=>setOpen(false)} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-3 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    {icon}
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
            <button onClick={()=>setOpen(false)} className="mt-3 w-full rounded-xl border border-slate-800 px-3 py-2 text-slate-300 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Close</button>
          </div>
        </div>
      )}
    </nav>
  );
}


