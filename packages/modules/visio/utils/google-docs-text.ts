/**
 * Extraction du texte d'un document Google Docs (API v1) — fonctions pures.
 *
 * Utilisé par syncMeetingResults pour transformer le transcript Google Meet
 * (stocké en Google Doc) en texte brut injectable dans les contextes Élio
 * (Hub : get_client_activity, One : « Dernières séances de coaching »).
 *
 * Réf. structure : GET https://docs.googleapis.com/v1/documents/{documentId}
 * → { body: { content: StructuralElement[] } }, texte dans
 * paragraph.elements[].textRun.content (+ tables imbriquées).
 */

export const TRANSCRIPT_TEXT_MAX_LENGTH = 50_000

interface GoogleDocsTextRun {
  textRun?: { content?: string }
}

interface GoogleDocsStructuralElement {
  paragraph?: { elements?: GoogleDocsTextRun[] }
  table?: {
    tableRows?: Array<{
      tableCells?: Array<{ content?: GoogleDocsStructuralElement[] }>
    }>
  }
}

function collectText(elements: GoogleDocsStructuralElement[], out: string[]): void {
  for (const element of elements) {
    if (element.paragraph?.elements) {
      for (const pe of element.paragraph.elements) {
        const content = pe.textRun?.content
        if (typeof content === 'string' && content.length > 0) {
          out.push(content)
        }
      }
    }
    if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          if (cell.content) collectText(cell.content, out)
        }
      }
    }
  }
}

/**
 * Extrait le texte brut d'un document Google Docs (réponse JSON de l'API).
 * Retourne null si le document ne contient aucun texte exploitable.
 * Le résultat est tronqué à maxLength caractères (défaut ~50 000).
 */
export function extractGoogleDocsText(
  doc: unknown,
  maxLength: number = TRANSCRIPT_TEXT_MAX_LENGTH,
): string | null {
  if (!doc || typeof doc !== 'object') return null
  const body = (doc as { body?: { content?: unknown } }).body
  if (!body || !Array.isArray(body.content)) return null

  const parts: string[] = []
  collectText(body.content as GoogleDocsStructuralElement[], parts)

  const text = parts.join('').replace(/\n{3,}/g, '\n\n').trim()
  if (text.length === 0) return null
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

/**
 * Résout le documentId d'un transcript Google Meet à partir de la
 * docsDestination : champ `document` en priorité (ID direct, éventuellement
 * préfixé `documents/`), sinon parsing de l'exportUri
 * (https://docs.google.com/document/d/{documentId}/...).
 */
export function parseGoogleDocumentId(params: {
  document?: string | null
  exportUri?: string | null
}): string | null {
  const direct = params.document?.trim()
  if (direct) {
    return direct.startsWith('documents/') ? direct.slice('documents/'.length) : direct
  }

  const uri = params.exportUri?.trim()
  if (uri) {
    const match = uri.match(/\/document\/d\/([^/?#]+)/)
    if (match?.[1]) return match[1]
  }

  return null
}
