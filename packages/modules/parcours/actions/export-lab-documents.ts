'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ExportedFile {
  path: string
  buffer: Buffer
  name: string
}

export async function exportLabDocuments(
  clientId: string
): Promise<ActionResponse<{ files: ExportedFile[]; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all documents for this client
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, name, file_path, file_type')
      .eq('client_id', clientId)
      .limit(10000)

    if (docsError) {
      return errorResponse(`Erreur récupération documents : ${docsError.message}`, 'DB_ERROR')
    }

    if (!documents || documents.length === 0) {
      return successResponse({ files: [], count: 0 })
    }

    const files: ExportedFile[] = []

    for (const doc of documents) {
      if (!doc.file_path) continue

      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(doc.file_path)

      if (downloadError) {
        // Skip files that can't be downloaded (deleted from storage, etc.)
        continue
      }

      const arrayBuffer = await fileData.arrayBuffer()
      files.push({
        path: `documents/${doc.name || doc.file_path.split('/').pop() || `doc-${doc.id}`}`,
        buffer: Buffer.from(arrayBuffer),
        name: doc.name || doc.file_path.split('/').pop() || `doc-${doc.id}`,
      })
    }

    return successResponse({ files, count: files.length })
  } catch (err) {
    return errorResponse(
      `Erreur export documents : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
