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
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-xs font-semibold text-cyan-200">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">{sender}</p>
        <p className="truncate text-xs text-gray-500">{preview}</p>
      </div>
      {time && <span className="shrink-0 text-xs text-gray-500">{time}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}
