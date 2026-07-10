'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ElioMessage, DashboardType } from '../types/elio.types'
import { parseGotoLinks } from '../utils/parse-goto-links'

interface ElioMessageProps {
  message: ElioMessage
  dashboardType: DashboardType
  feedbackSlot?: React.ReactNode
  documentSlot?: React.ReactNode
}

export function ElioMessageItem({ message, dashboardType, feedbackSlot, documentSlot }: ElioMessageProps) {
  const isUser = message.role === 'user'

  // Deep-linking (Élio One v2) : Élio peut suggérer un onglet via un jeton [[goto:…]].
  // On l'extrait pour le rendre en bouton cliquable (côté client uniquement, jamais Hub).
  // Le texte affiché est nettoyé du jeton brut dans tous les cas.
  const { text: displayText, links: gotoLinks } =
    !isUser && dashboardType !== 'hub'
      ? parseGotoLinks(message.content)
      : { text: message.content, links: [] }

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
            : 'border border-white/10 bg-white/[0.05] text-gray-100 rounded-bl-sm',
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
              {displayText}
            </ReactMarkdown>
          </div>
        )}
        {/* Deep-linking : boutons « je t'emmène au bon onglet » */}
        {!isUser && gotoLinks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {gotoLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
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
