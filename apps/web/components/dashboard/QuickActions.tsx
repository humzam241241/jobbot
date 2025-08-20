"use client";
import Link from "next/link";
import { FileSignature, Globe, NotebookPen, BarChart3 } from "lucide-react";

export default function QuickActions() {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900 transition will-change-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  return (
    <div className="grid grid-cols-2 sm:auto-cols-fr sm:grid-flow-col gap-2">
      <Link aria-label="Generate Resume" href="/jobbot" className={base}>
        <FileSignature size={16} aria-hidden="true" />
        <span>Generate Resume</span>
      </Link>
      <Link aria-label="Open Scraper" href="/scraper" className={base}>
        <Globe size={16} aria-hidden="true" />
        <span>Open Scraper</span>
      </Link>
      <Link aria-label="Log Application" href="/applications" className={base}>
        <NotebookPen size={16} aria-hidden="true" />
        <span>Log Application</span>
      </Link>
      <Link aria-label="View ATS" href="/ats" className={base}>
        <BarChart3 size={16} aria-hidden="true" />
        <span>View ATS</span>
      </Link>
    </div>
  );
}


