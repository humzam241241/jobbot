import React from 'react'

type SectionCardProps = {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}

function SectionCard({ title, subtitle, right, children, className }: SectionCardProps) {
  return (
    <section className={`card ${className||''}`}>
      {(title || subtitle || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--muted)] pb-4 mb-4">
          <div>
            {title && <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--subtle)]">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div>
        {children}
      </div>
    </section>
  )
}

export default SectionCard;
export { SectionCard };


