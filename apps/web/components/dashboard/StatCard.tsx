import React from 'react'

type StatCardProps = {
  title: string
  value: React.ReactNode
  caption?: string
  children?: React.ReactNode
}

export default function StatCard({ title, value, caption, children }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-white/[0.03] dark:bg-black/30 backdrop-blur shadow-sm">
      <div className="p-4 md:p-6 space-y-2">
        <div className="text-sm text-slate-400">{title}</div>
        <div className="text-2xl md:text-3xl font-semibold tracking-tight">{value}</div>
        {caption && <div className="text-xs text-slate-500">{caption}</div>}
        {children}
      </div>
    </section>
  )
}


