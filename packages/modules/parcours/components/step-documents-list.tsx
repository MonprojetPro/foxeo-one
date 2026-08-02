'use client'

import { showSuccess, showError } from '@monprojetpro/ui'
import { formatRelativeDate, buildMarkdownPdfDefinition, slugifyDocumentName } from '@monprojetpro/utils'
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

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|.+\|/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function copyFormattedText(content: string): Promise<void> {
  await navigator.clipboard.writeText(stripMarkdown(content))
}

/**
 * Fabrique le PDF et le télécharge directement — un clic, un fichier, sans
 * dialogue d'impression.
 *
 * Troisième et dernière génération de ce code. Les deux précédentes ont échoué :
 * - html2canvas-pro + jsPDF photographiait le document et tranchait l'image tous
 *   les 297 mm, en plein milieu des tableaux et des encarts ;
 * - l'impression navigateur paginait correctement mais imposait au client de
 *   choisir « Enregistrer au format PDF » dans le dialogue système.
 * On décrit désormais la STRUCTURE du document (voir `buildMarkdownPdfDefinition`)
 * et pdfmake pagine en connaissance de cause.
 *
 * pdfmake pèse ~2 Mo : il est chargé dynamiquement, au clic seulement, pour ne pas
 * alourdir le chargement de la page.
 */
async function downloadPdf(content: string, title: string, dateIso: string): Promise<void> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])

  const pdfMake = ((pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod) as {
    vfs?: unknown
    createPdf?: (def: unknown) => { download: (name: string) => void }
  }

  // Les polices vivent dans un système de fichiers virtuel qu'il faut brancher soi-même,
  // sinon pdfmake ne trouve pas Roboto et ne produit aucun fichier. La forme de l'export
  // a changé selon les versions : on couvre les trois connues.
  const vfsExport = ((vfsMod as { default?: unknown }).default ?? vfsMod) as Record<string, unknown>
  pdfMake.vfs =
    (vfsExport.pdfMake as { vfs?: unknown } | undefined)?.vfs
    ?? vfsExport.vfs
    ?? vfsExport

  const createPdf = pdfMake.createPdf
  if (typeof createPdf !== 'function') {
    throw new Error('Impossible de charger le moteur PDF')
  }

  const dateStr = new Date(dateIso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const definition = buildMarkdownPdfDefinition(content, {
    title,
    dateLabel: `Généré le ${dateStr}`,
    accentColor: '#7c3aed',
  })

  createPdf(definition).download(`${slugifyDocumentName(title)}.pdf`)
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
                {stripMarkdown(doc.content).slice(0, 120)}{stripMarkdown(doc.content).length > 120 ? '…' : ''}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0 mt-0.5">
              <button
                onClick={async () => {
                  try {
                    await copyFormattedText(doc.content)
                    showSuccess('Texte copié dans le presse-papier')
                  } catch {
                    showError('Impossible de copier — vérifiez les permissions du navigateur')
                  }
                }}
                className="rounded-lg p-1.5 text-[#6b7280] hover:text-[#a78bfa] hover:bg-[#1a1033] transition-all"
                title="Copier le texte formaté"
                aria-label="Copier le texte du document"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
              <button
                onClick={async () => {
                  try {
                    await downloadPdf(doc.content, doc.title, doc.date)
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e)
                    console.error('[STEP-DOCUMENTS-LIST] PDF generation failed:', e)
                    showError(`Échec PDF : ${msg.slice(0, 200)}`)
                  }
                }}
                className="rounded-lg p-1.5 text-[#6b7280] hover:text-[#a78bfa] hover:bg-[#1a1033] transition-all"
                title="Télécharger en PDF"
                aria-label="Télécharger le document en PDF"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
