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
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
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
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words
            [&>p]:mb-2 [&>p:last-child]:mb-0
            [&>ul]:mb-2 [&>ul]:pl-4 [&>ul>li]:mb-0.5
            [&>ol]:mb-2 [&>ol]:pl-4 [&>ol>li]:mb-0.5
            [&>h1]:text-base [&>h1]:font-bold [&>h1]:mb-1
            [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-1
            [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1
            [&>strong]:font-semibold [&_strong]:font-semibold
            [&>hr]:border-current/20 [&>hr]:my-2">
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
