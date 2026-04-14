import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface MessageItemProps {
  sender: string
  preview: string
  time?: string
  href?: string
}

export function MessageItem({ sender, preview, time, href }: MessageItemProps) {
  const initials = sender.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Link
      href={href ?? '/modules/chat'}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent/50 transition-colors group"
    >
      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-primary shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium">{sender}</p>
        <p className="text-xs text-muted-foreground truncate">{preview}</p>
      </div>
      {time && <span className="text-xs text-muted-foreground shrink-0">{time}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  )
}
