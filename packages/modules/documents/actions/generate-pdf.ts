'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GeneratePdfInput, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'
import { markdownToHtml } from '../utils/markdown-to-html'
import { wrapHtmlForPdf } from '../utils/pdf-generator'

const MARKDOWN_EXTENSIONS = ['md', 'markdown']

export async function generatePdf(
  input: GeneratePdfInput
): Promise<ActionResponse<{ htmlContent: string; fileName: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GeneratePdfInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId } = parsed.data

    // Fetch document metadata (RLS enforced)
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      console.error('[DOCUMENTS:GENERATE_PDF] Document not found:', docError)
      return errorResponse('Document introuvable', 'NOT_FOUND')
    }

    const typedDoc = doc as DocumentDB
    const extension = typedDoc.file_type.toLowerCase()

    // Only generate PDF from Markdown files
    if (!MARKDOWN_EXTENSIONS.includes(extension)) {
      return errorResponse(
        'La génération PDF n\'est disponible que pour les fichiers Markdown',
        'UNSUPPORTED_FORMAT'
      )
    }

    // Download Markdown content from Storage via signed URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(typedDoc.file_path, 60)

    if (urlError || !urlData) {
      console.error('[DOCUMENTS:GENERATE_PDF] Signed URL error:', urlError)
      return errorResponse('Erreur lors de l\'accès au fichier', 'STORAGE_ERROR', urlError)
    }

    // Fetch the Markdown content
    const response = await fetch(urlData.signedUrl)
    if (!response.ok) {
      console.error('[DOCUMENTS:GENERATE_PDF] Fetch failed:', response.status)
      return errorResponse('Impossible de télécharger le contenu du document', 'FETCH_ERROR')
    }

    const markdownContent = await response.text()

    // Convert Markdown → HTML → Branded PDF HTML
    const htmlBody = markdownToHtml(markdownContent)
    const document = toDocument(typedDoc)
    const now = new Date()
    const formattedDate = now.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const brandedHtml = wrapHtmlForPdf(htmlBody, {
      documentName: document.name,
      generatedDate: formattedDate,
    })

    // Generate PDF filename
    const baseName = typedDoc.name.replace(/\.[^.]+$/, '')
    const fileName = `${baseName}.pdf`

    return successResponse({
      htmlContent: brandedHtml,
      fileName,
    })
  } catch (error) {
    console.error('[DOCUMENTS:GENERATE_PDF] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
