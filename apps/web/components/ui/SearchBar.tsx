import React from 'react'

type Props = {
  placeholder?: string
  value: string
  onChange: (v: string) => void
}

export default function SearchBar({ placeholder = 'Search…', value, onChange }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-black/30 backdrop-blur px-3 py-2">
      <input
        aria-label="Search"
        placeholder={placeholder}
        className="w-full bg-transparent outline-none placeholder:text-slate-500"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
      />
    </div>
  )
}


