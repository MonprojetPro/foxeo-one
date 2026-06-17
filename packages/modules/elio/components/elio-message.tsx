'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ElioMessage, DashboardType } from '../types/elio.types'

interface ElioMessageProps {
  message: ElioMessage
  dashboardType: DashboardType
  feedbackSlot?: React.ReactNode
  documentSlot?: React.ReactNode
}

export function ElioMessageItem({ message, dashboardType, feedbackSlot, documentSlot }: ElioMessageProps) {
  const isUser = message.role === 'user'

  const paletteClass = {
    hub: 'elio-palette-hub',
    lab: 'elio-palette-lab',
    one: 'elio-palette-one',
  }[dashboardType]

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full group`}
      data-role={message.role}
      data-dashboard={dashboardType}
    >
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
          paletteClass,
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
          message.isError ? 'border border-destructive/30 bg-destructive/10 text-destructive' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          // Sélecteurs en descendant (_) et non enfant direct (>) pour styler aussi les
          // listes imbriquées. list-disc / list-decimal garantissent des marqueurs visibles
          // (puces OU numéros) quelle que soit la réinitialisation CSS globale.
          <div className="max-w-none break-words text-[15px] leading-relaxed
            [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
            [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc
            [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal
            [&_li]:my-1 [&_li]:pl-1 [&_li]:marker:text-current/60
            [&_h1]:text-[18px] [&_h1]:font-bold [&_h1]:my-2
            [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:my-2
            [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:my-1.5
            [&_strong]:font-semibold
            [&_a]:underline [&_a]:text-primary hover:[&_a]:text-primary/80
            [&_hr]:border-current/20 [&_hr]:my-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {documentSlot && (
          <div className="mt-2">{documentSlot}</div>
        )}
        {!isUser && feedbackSlot && (
          <div className="mt-2 border-t border-current/10 pt-2">{feedbackSlot}</div>
        )}
      </div>
    </div>
  )
}
