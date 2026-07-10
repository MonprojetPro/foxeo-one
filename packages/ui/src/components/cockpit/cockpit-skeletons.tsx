import { cn } from '@monprojetpro/utils'

/** Skeleton d'une carte héros (KPI). */
export function HeroStatSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-[7.5rem] animate-pulse rounded-2xl bg-white/5', className)} />
}

/** Skeleton d'une mini-carte métrique. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-24 animate-pulse rounded-xl bg-white/5', className)} />
}

/** Skeleton d'une ligne (table, liste). */
export function RowSkeleton({ className }: { className?: string }) {
  return <div className={cn('h-8 animate-pulse rounded bg-white/5', className)} />
}

/** Bloc générique de skeleton (hauteur libre via className). */
export function BlockSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />
}
