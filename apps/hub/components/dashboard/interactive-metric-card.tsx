'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@monprojetpro/utils'

interface ClientLink {
  id: string
  name: string
  company: string
}

interface PopupSection {
  label: string
  count: number
  items: ClientLink[]
  emptyText?: string
  accentColor?: 'green' | 'yellow' | 'red' | 'default'
}

interface InteractiveMetricCardProps {
  title: string
  value: string
  subtitle: string
  accentColor?: 'primary' | 'destructive' | 'muted'
  sections: PopupSection[]
}

const sectionAccents: Record<string, string> = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  default: 'text-muted-foreground',
}

export function InteractiveMetricCard({
  title,
  value,
  subtitle,
  accentColor = 'muted',
  sections,
}: InteractiveMetricCardProps) {
  const [open, setOpen] = useState(false)

  const borderColors = {
    primary: 'border-t-primary',
    destructive: 'border-t-destructive',
    muted: 'border-t-border',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'bg-card rounded-lg border border-border p-4 border-t-2 text-left w-full',
          'hover:bg-card/80 hover:border-primary/30 transition-colors cursor-pointer',
          borderColors[accentColor]
        )}
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        <p className="mt-2 text-[0.65rem] text-primary/60">Cliquer pour le détail →</p>
      </button>

      {/* Popup overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header popup */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sections */}
            <div className="p-5 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
              {sections.map((section) => (
                <div key={section.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold uppercase tracking-wide', sectionAccents[section.accentColor ?? 'default'])}>
                      {section.label}
                    </span>
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
                      {section.count}
                    </span>
                  </div>
                  {section.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{section.emptyText ?? 'Aucun'}</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/modules/crm/clients/${item.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50 transition-colors group"
                          >
                            <div>
                              <span className="font-medium group-hover:text-primary transition-colors">{item.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{item.company}</span>
                            </div>
                            <svg className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
