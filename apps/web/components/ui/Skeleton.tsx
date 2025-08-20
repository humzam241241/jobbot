import React from 'react'

type SkeletonProps = { className?: string }

export default function Skeleton({ className }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-slate-800/70 ${className||''}`} />
}


