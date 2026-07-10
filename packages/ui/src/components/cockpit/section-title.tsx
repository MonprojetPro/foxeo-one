import { cn } from '@monprojetpro/utils'

export interface SectionTitleProps {
  children: React.ReactNode
  /** Slot d'action optionnel affiché à droite (lien, bouton…). */
  action?: React.ReactNode
  className?: string
}

/** Titre de section discret en petites majuscules espacées. */
export function SectionTitle({ children, action, className }: SectionTitleProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
        {children}
      </h2>
      {action}
    </div>
  )
}
