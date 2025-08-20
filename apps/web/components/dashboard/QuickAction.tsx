"use client";
import Link from "next/link";
import * as Icons from "lucide-react";

type QuickActionProps = {
  icon: keyof typeof Icons
  label: string
  href: string
}

export default function QuickAction({ icon, label, href }: QuickActionProps) {
  const Icon = Icons[icon] as React.ComponentType<any>;
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm hover:bg-slate-900 transition will-change-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}


