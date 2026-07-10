'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@monprojetpro/ui'
import { Info } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  tooltip?: string
  icon?: React.ReactNode
}

export function KpiCard({ label, value, tooltip, icon }: KpiCardProps) {
  return (
    // Carte KPI cockpit — fond sombre, accent Hub au survol
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
      {/* En-tête : libellé + icône info optionnelle */}
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Valeur principale + icône métier */}
      <div className="flex items-center gap-2 mt-1">
        {icon}
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">
          {value}
        </span>
      </div>
    </div>
  )
}
