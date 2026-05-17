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

function buildPdfHtml(markdownHtml: string, title: string, dateIso: string): string {
  const dateStr = new Date(dateIso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  // ⚠️ Pas de @import Google Fonts ici : html2canvas tente de fetch les fonts
  // en mode CORS et échoue silencieusement → la génération PDF plante. On utilise
  // exclusivement la stack système (Apple system / Segoe UI / etc.).
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #1f2937;
    line-height: 1.6;
    font-size: 11pt;
    background: #ffffff;
  }
  .page {
    padding: 40px 48px 60px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    border-bottom: 2px solid #7c3aed;
    padding-bottom: 18px;
    margin-bottom: 28px;
  }
  .header .brand {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-weight: 700;
    font-size: 18pt;
    color: #7c3aed;
    letter-spacing: -0.01em;
  }
  .header .brand-suffix { color: #1f2937; }
  .header .doc-title {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-weight: 600;
    font-size: 22pt;
    color: #111827;
    margin-top: 12px;
    line-height: 1.25;
  }
  .header .date {
    color: #6b7280;
    font-size: 10pt;
    margin-top: 6px;
  }
  .content {
    font-size: 11pt;
  }
  .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #111827;
    line-height: 1.3;
    margin-top: 22px;
    margin-bottom: 10px;
  }
  .content h1 { font-size: 18pt; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .content h2 { font-size: 14pt; font-weight: 600; color: #7c3aed; }
  .content h3 { font-size: 12pt; font-weight: 600; }
  .content h4, .content h5, .content h6 { font-size: 11pt; font-weight: 600; }
  .content p { margin: 10px 0; }
  .content ul, .content ol { margin: 10px 0; padding-left: 24px; }
  .content li { margin: 4px 0; }
  .content strong { color: #111827; font-weight: 600; }
  .content em { color: #374151; }
  .content code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 10pt;
    color: #7c3aed;
  }
  .content pre {
    background: #1f2937;
    color: #f9fafb;
    padding: 14px 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 9.5pt;
    line-height: 1.5;
  }
  .content pre code { background: transparent; color: inherit; padding: 0; }
  .content blockquote {
    border-left: 3px solid #7c3aed;
    background: #f5f3ff;
    margin: 14px 0;
    padding: 10px 16px;
    color: #4b5563;
    font-style: italic;
  }
  .content table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0;
    font-size: 10pt;
  }
  .content th, .content td {
    border: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: left;
  }
  .content th {
    background: #f9fafb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-weight: 600;
    color: #111827;
  }
  .content a { color: #7c3aed; text-decoration: underline; }
  .content hr { border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    color: #9ca3af;
    font-size: 9pt;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="brand">Monprojet<span class="brand-suffix">Pro</span></div>
      <h1 class="doc-title">${escapeHtml(title)}</h1>
      <div class="date">Généré le ${dateStr}</div>
    </header>
    <main class="content">${markdownHtml}</main>
    <footer class="footer">
      Document généré par MonprojetPro · monprojet-pro.com
    </footer>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugifyFilename(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function downloadPdf(content: string, title: string, dateIso: string): Promise<void> {
  // Imports dynamiques : libs browser-only, casseraient le SSR Next.js en static.
  // - html2canvas-pro : fork de html2canvas avec support OKLCH/lab/lch (Tailwind v4)
  // - jspdf : moteur PDF, construit le doc à partir du canvas
  // - marked : markdown → HTML
  const [markedMod, html2canvasMod, jspdfMod] = await Promise.all([
    import('marked'),
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  const marked = (markedMod as { marked?: { parse: (s: string, o?: unknown) => string | Promise<string> }; default?: unknown }).marked
    ?? (markedMod as { default: { parse: (s: string, o?: unknown) => string | Promise<string> } }).default
  const html2canvas = (html2canvasMod as { default?: unknown }).default ?? (html2canvasMod as unknown)
  const jsPDFCtor = (jspdfMod as { jsPDF?: unknown }).jsPDF ?? (jspdfMod as { default?: unknown }).default

  if (!marked || typeof html2canvas !== 'function' || typeof jsPDFCtor !== 'function') {
    throw new Error('Impossible de charger les libs PDF (marked / html2canvas-pro / jspdf)')
  }

  const markdownHtml = await marked.parse(content, { gfm: true, breaks: true })
  const fullHtml = buildPdfHtml(String(markdownHtml), title, dateIso)

  // Container caché : html2canvas-pro a besoin que l'élément soit dans le DOM
  // pour calculer le layout. position:fixed + opacity:0 + pointer-events:none.
  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:0;top:0;width:820px;opacity:0;pointer-events:none;z-index:-1;background:#ffffff'
  container.innerHTML = fullHtml
  document.body.appendChild(container)

  try {
    const target = (container.querySelector('.page') ?? container) as HTMLElement

    const canvas = await (html2canvas as (el: HTMLElement, opts?: unknown) => Promise<HTMLCanvasElement>)(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Construire le PDF A4 portrait depuis le canvas
    // A4 = 210 × 297 mm. On scale l'image pour qu'elle fasse la largeur A4.
    const PdfCtor = jsPDFCtor as new (opts: { unit: string; format: string; orientation: string }) => {
      internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
      addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void
      addPage: () => void
      save: (filename: string) => void
    }
    const pdf = new PdfCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    // Pagination : si le canvas est plus haut qu'une page, on découpe verticalement.
    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
    } else {
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
    }

    pdf.save(`${slugifyFilename(title)}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
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
