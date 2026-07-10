'use client'

/** Skeleton cockpit de la fenêtre de chat — bulles alternées animate-pulse bg-white/5, jamais de spinner. */
export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" data-testid="chat-skeleton">
      {/* Header de conversation — skeleton */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-white/5" />
          <div className="h-2.5 w-16 animate-pulse rounded bg-white/5" />
        </div>
      </div>

      {/* Bulles — alternées gauche/droite */}
      {/* Opérateur gauche */}
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/5" />
        <div className="h-12 w-48 animate-pulse rounded-2xl rounded-bl-none bg-white/5" />
      </div>
      {/* Client droite */}
      <div className="flex items-end justify-end gap-2">
        <div className="h-10 w-64 animate-pulse rounded-2xl rounded-br-none bg-white/5" />
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/5" />
      </div>
      {/* Opérateur gauche */}
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/5" />
        <div className="h-16 w-56 animate-pulse rounded-2xl rounded-bl-none bg-white/5" />
      </div>
      {/* Client droite */}
      <div className="flex items-end justify-end gap-2">
        <div className="h-10 w-40 animate-pulse rounded-2xl rounded-br-none bg-white/5" />
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/5" />
      </div>

      {/* Barre de saisie — skeleton */}
      <div className="mt-auto flex items-end gap-2 border-t border-white/10 pt-4">
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-white/5" />
        <div className="h-9 w-9 animate-pulse rounded-lg bg-white/5" />
      </div>
    </div>
  )
}
