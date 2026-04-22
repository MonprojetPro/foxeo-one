/**
 * Story 14.6 — Task 2.1
 * Extraction du contenu textuel d'un fichier uploadé (côté serveur, sans FileReader).
 * Supporte : TXT, DOCX (mammoth), PDF (placeholder — contenu brut non extrait).
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export interface ExtractedFileText {
  text: string
}

export async function extractFileText(
  file: File
): Promise<{ result: ExtractedFileText | null; error: string | null }> {
  if (file.size > MAX_FILE_SIZE) {
    return { result: null, error: 'Le fichier dépasse la taille maximale de 10 Mo' }
  }

  const mime = file.type

  // Validation stricte sur le MIME uniquement (l'extension est falsifiable côté client)
  const isTxt = mime === 'text/plain'
  const isPdf = mime === 'application/pdf'
  const isDocx = mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  if (!isTxt && !isPdf && !isDocx) {
    return {
      result: null,
      error: `Format "${mime || 'inconnu'}" non supporté — formats acceptés : txt, pdf, docx`,
    }
  }

  try {
    if (isTxt) {
      const arrayBuffer = await file.arrayBuffer()
      const text = new TextDecoder('utf-8').decode(arrayBuffer).trim()
      if (!text) return { result: null, error: 'Le fichier texte est vide' }
      return { result: { text }, error: null }
    }

    if (isDocx) {
      const mammoth = await import('mammoth')
      const arrayBuffer = await file.arrayBuffer()
      const { value } = await mammoth.extractRawText({ arrayBuffer })
      const trimmed = value.trim()
      if (!trimmed) return { result: null, error: 'Document Word vide ou non lisible' }
      return { result: { text: trimmed }, error: null }
    }

    if (isPdf) {
      // Placeholder — extraction PDF native non disponible côté serveur sans dépendance externe.
      // Le fichier est stocké dans Supabase Storage et référencé dans file_path.
      return {
        result: { text: `[Document PDF : ${file.name}]` },
        error: null,
      }
    }
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier',
    }
  }

  return { result: null, error: 'Format non supporté' }
}
