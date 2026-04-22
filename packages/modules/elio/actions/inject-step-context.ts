'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { extractFileText, SUPPORTED_MIME_TYPES } from './extract-file-text'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
const MAX_TEXT_LENGTH = 5000

const ParamsSchema = z.object({
  parcoursAgentId: z.string().uuid('parcoursAgentId invalide'),
  clientId: z.string().uuid('clientId invalide'),
})

/**
 * Story 14.6 — Task 3.1
 * Server Action — Injecte un contexte (texte ou fichier) dans l'Élio d'une étape pour un client.
 *
 * FormData attendu :
 * - Pour un texte : { text: string }
 * - Pour un fichier : { file: File } (PDF, DOCX, TXT)
 */
export async function injectStepContext(
  parcoursAgentId: string,
  clientId: string,
  formData: FormData
): Promise<ActionResponse<{ id: string }>> {
  const parsed = ParamsSchema.safeParse({ parcoursAgentId, clientId })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Vérifier que le parcoursAgentId appartient bien au clientId (ownership check)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agent, error: agentError } = await (supabase as any)
      .from('client_parcours_agents')
      .select('id')
      .eq('id', parsed.data.parcoursAgentId)
      .eq('client_id', parsed.data.clientId)
      .maybeSingle() as { data: { id: string } | null; error: unknown }

    if (agentError) {
      return errorResponse("Erreur lors de la vérification de l'agent", 'DB_ERROR', {
        message: String(agentError),
      })
    }
    if (!agent) {
      return errorResponse("Agent introuvable pour ce client", 'NOT_FOUND')
    }

    const textRaw = formData.get('text') as string | null
    const file = formData.get('file') as File | null

    if (!textRaw && !file) {
      return errorResponse('Texte ou fichier requis', 'VALIDATION_ERROR')
    }

    let contextMessage: string
    let contentType: 'text' | 'file'
    let filePath: string | null = null
    let fileName: string | null = null

    if (textRaw !== null && textRaw !== '') {
      // Injection de type texte
      const text = textRaw.trim()
      if (!text) return errorResponse('Le texte ne peut pas être vide', 'VALIDATION_ERROR')
      if (text.length > MAX_TEXT_LENGTH) {
        return errorResponse(
          `Le texte ne peut pas dépasser ${MAX_TEXT_LENGTH} caractères`,
          'VALIDATION_ERROR'
        )
      }
      contextMessage = text
      contentType = 'text'
    } else if (file) {
      // Injection de type fichier
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('Le fichier dépasse la taille maximale de 10 Mo', 'FILE_TOO_LARGE')
      }
      if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type)) {
        return errorResponse(
          'Format non supporté — formats acceptés : txt, pdf, docx',
          'INVALID_FILE_TYPE'
        )
      }

      // Extraction texte
      const { result: extractResult, error: extractError } = await extractFileText(file)
      if (extractError || !extractResult) {
        return errorResponse(
          extractError ?? "Impossible d'extraire le texte du fichier",
          'EXTRACTION_ERROR'
        )
      }
      contextMessage = extractResult.text
      contentType = 'file'
      fileName = file.name

      // Sanitisation du nom avant upload (leçon DL-002)
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')

      filePath = `${user.id}/${clientId}/${parcoursAgentId}/${Date.now()}-${sanitizedName}`

      const { error: uploadError } = await supabase.storage
        .from('step-contexts')
        .upload(filePath, file)

      if (uploadError) {
        console.error('[ELIO:INJECT_STEP_CONTEXT] Upload error:', uploadError)
        return errorResponse("Erreur lors de l'upload du fichier", 'STORAGE_ERROR', {
          message: String(uploadError),
        })
      }
    } else {
      return errorResponse('Texte ou fichier requis', 'VALIDATION_ERROR')
    }

    // Création de l'entrée en base
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error: insertError } = await (supabase as any)
      .from('client_step_contexts')
      .insert({
        client_id: clientId,
        client_parcours_agent_id: parcoursAgentId,
        context_message: contextMessage,
        content_type: contentType,
        file_path: filePath,
        file_name: fileName,
      })
      .select('id')
      .single()

    if (insertError || !row) {
      console.error('[ELIO:INJECT_STEP_CONTEXT] Insert error:', insertError)
      // Rollback Storage si upload réalisé mais insert DB échoué
      if (filePath) {
        await supabase.storage.from('step-contexts').remove([filePath]).catch(() => {})
      }
      return errorResponse('Erreur lors de la création du contexte', 'DB_ERROR', {
        message: insertError ? String(insertError) : 'No data returned',
      })
    }

    return successResponse({ id: (row as { id: string }).id })
  } catch (error) {
    console.error('[ELIO:INJECT_STEP_CONTEXT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
