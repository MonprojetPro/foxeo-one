import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@monprojetpro/ui'

interface ValidationItemProps {
  tag: string
  tagVariant: 'destructive' | 'default'
  client: string
  description: string
  delay?: string
  href?: string
}

export function ValidationItem({ tag, tagVariant, client, description, delay, href }: ValidationItemProps) {
  return (
    <Link
      href={href ?? '/modules/validation-hub'}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/50 transition-colors group"
    >
      <Badge variant={tagVariant} className="shrink-0 text-[0.65rem] px-2 py-0.5">
        {tag}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium">{client}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      {delay && <span className="text-xs text-destructive shrink-0">{delay}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}
