import { cn } from '@monprojetpro/utils'

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  accentColor?: 'primary' | 'destructive' | 'muted'
}

export function MetricCard({ title, value, subtitle, accentColor = 'muted' }: MetricCardProps) {
  const borderColors = {
    primary: 'border-t-primary',
    destructive: 'border-t-destructive',
    muted: 'border-t-border',
  }

  return (
    <div className={cn('bg-card rounded-lg border border-border p-4 border-t-2', borderColors[accentColor])}>
      <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
