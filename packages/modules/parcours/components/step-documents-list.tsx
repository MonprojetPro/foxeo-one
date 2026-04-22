'use client'

import { showSuccess, showError } from '@monprojetpro/ui'
import { formatRelativeDate } from '@monprojetpro/utils'
import type { StepSubmission } from '../types/parcours.types'

interface DocumentEntry {
  id: string
  title: string
  content: string
  date: string
}

interface StepDocumentsListProps {
  submissions: StepSubmission[]
}

/**
 * Les "documents générés" sont les submission_content des step_submissions.
 * Pas de table séparée pour l'instant — on expose chaque soumission comme un document.
 */
function toDocuments(submissions: StepSubmission[]): DocumentEntry[] {
  return submissions.map((s) => ({
    id: s.id,
    title: `Document — ${new Date(s.submittedAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    content: s.submissionContent,
    date: s.submittedAt,
  }))
}

async function copyToClipboard(content: string): Promise<void> {
  await navigator.clipboard.writeText(content)
}

export function StepDocumentsList({ submissions }: StepDocumentsListProps) {
  const documents = toDocuments(submissions)

  if (documents.length === 0) {
    return (
      <p className="text-xs text-[#6b7280] italic py-1">
        Aucun document généré pour cette étape
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="rounded-xl border border-[#2d2d2d] bg-[#141414]/60 px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#e5e7eb] truncate">{doc.title}</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                {formatRelativeDate(doc.date)}
              </p>
              <p className="text-xs text-[#9ca3af] mt-1.5 line-clamp-2 leading-relaxed">
                {doc.content.slice(0, 100)}{doc.content.length > 100 ? '…' : ''}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await copyToClipboard(doc.content)
                  showSuccess('Document copié dans le presse-papier')
                } catch {
                  showError('Impossible de copier — vérifiez les permissions du navigateur')
                }
              }}
              className="shrink-0 mt-0.5 rounded-lg p-1.5 text-[#6b7280] hover:text-[#a78bfa] hover:bg-[#1a1033] transition-all"
              title="Copier le markdown"
              aria-label="Copier le contenu du document"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
