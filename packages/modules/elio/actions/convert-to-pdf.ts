'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'

/**
 * Story 8.9b — Task 6
 * Server Action — Convertit le contenu d'un document en HTML et l'uploade dans Supabase Storage.
 * Retourne une signed URL valable 1 heure.
 *
 * Note d'implémentation : génère un document HTML stylisé uploadé dans Storage.
 * Une vraie conversion PDF nécessiterait puppeteer ou @react-pdf/renderer (dépendance optionnelle future).
 */
export async function convertToPdf(
  content: string,
  fileName: string,
  clientId: string
): Promise<ActionResponse<string>> {
  if (!content || !fileName || !clientId) {
    return errorResponse('content, fileName et clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Convertir le markdown en HTML lisible pour le document
  const htmlContent = buildHtmlDocument(content, fileName)
  const fileBuffer = Buffer.from(htmlContent, 'utf-8')
  const storagePath = `generated/${clientId}/${fileName}-${Date.now()}.html`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'text/html; charset=utf-8',
      upsert: false,
    })

  if (uploadError) {
    return errorResponse('Erreur lors de l\'upload du document', 'STORAGE_ERROR', uploadError)
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(uploadData.path, 3600)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return errorResponse('Erreur lors de la génération de l\'URL signée', 'STORAGE_ERROR', signedUrlError)
  }

  return successResponse(signedUrlData.signedUrl)
}

/**
 * Construit un document HTML stylisé à partir du contenu markdown.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtmlDocument(content: string, title: string): string {
  const escapedTitle = escapeHtml(title)
  // Échapper les caractères HTML basiques puis convertir le markdown en HTML
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convertir le markdown de base en HTML
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #333;
      line-height: 1.6;
    }
    h1, h2 { color: #1a1a1a; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
    p { margin: 12px 0; }
    li { margin: 4px 0; }
    @media print {
      body { margin: 20mm; }
    }
  </style>
</head>
<body>
  <p>${escaped}</p>
</body>
</html>`
}
