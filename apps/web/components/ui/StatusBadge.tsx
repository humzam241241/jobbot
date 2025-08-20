import React from 'react'

type Props = { status: 'Planned' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' };

export default function StatusBadge({ status }: Props) {
  const color = {
    Planned: 'bg-slate-700 text-slate-200',
    Applied: 'bg-blue-700 text-blue-100',
    Interview: 'bg-amber-700 text-amber-100',
    Offer: 'bg-emerald-700 text-emerald-100',
    Rejected: 'bg-rose-800 text-rose-100',
  }[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${color}`}>{status}</span>;
}


