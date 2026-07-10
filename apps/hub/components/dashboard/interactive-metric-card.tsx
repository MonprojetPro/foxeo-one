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
  green: 'text-emerald-300',
  yellow: 'text-amber-300',
  red: 'text-red-300',
  default: 'text-gray-500',
}

export function InteractiveMetricCard({
  title,
  value,
  subtitle,
  accentColor = 'muted',
  sections,
}: InteractiveMetricCardProps) {
  const [open, setOpen] = useState(false)

  const accent = {
    primary: { top: 'border-t-cyan-400/50', value: 'text-white', glow: 'bg-cyan-400/10' },
    destructive: { top: 'border-t-red-400/50', value: 'text-red-200', glow: 'bg-red-400/10' },
    muted: { top: 'border-t-white/15', value: 'text-white', glow: 'bg-white/5' },
  }[accentColor]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border border-white/10 border-t-2 bg-white/[0.025] p-4 text-left transition-all duration-200',
          'cursor-pointer hover:border-cyan-400/30 hover:bg-white/[0.04]',
          accent.top,
        )}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90',
            accent.glow,
          )}
        />
        <p className="relative text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">{title}</p>
        <p className={cn('relative mt-1 text-2xl font-semibold tabular-nums tracking-tight', accent.value)}>{value}</p>
        <p className="relative mt-0.5 text-xs text-gray-500">{subtitle}</p>
        <p className="relative mt-2 text-[0.65rem] text-cyan-300/60">Cliquer pour le détail →</p>
      </button>

      {/* Popup overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f0e] shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header popup */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-500 transition-colors hover:text-gray-200"
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
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-200">
                      {section.count}
                    </span>
                  </div>
                  {section.items.length === 0 ? (
                    <p className="text-xs italic text-gray-500">{section.emptyText ?? 'Aucun'}</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={`/modules/crm/clients/${item.id}`}
                            onClick={() => setOpen(false)}
                            className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                          >
                            <div>
                              <span className="font-medium text-gray-100 transition-colors group-hover:text-cyan-200">{item.name}</span>
                              <span className="ml-2 text-xs text-gray-500">{item.company}</span>
                            </div>
                            <svg className="h-3.5 w-3.5 shrink-0 text-gray-500 transition-colors group-hover:text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
