import Link from "next/link";

export function QuickAction({ icon, label, href }: { icon?: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-neutral-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:w-auto"
    >
      {icon}{label}
    </Link>
  );
}


