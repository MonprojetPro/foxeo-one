'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'
import { exportLabDocuments } from './export-lab-documents'
import { exportLabBriefs } from './export-lab-briefs'
import { exportLabChats } from '../../elio/actions/export-lab-chats'
import { buildLabZip } from '../utils/build-lab-zip'
import { uploadLabExport } from './upload-lab-export'

const StartLabExitKitInputSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
})

export type StartLabExitKitInput = z.infer<typeof StartLabExitKitInputSchema>

export async function startLabExitKit(
  input: StartLabExitKitInput
): Promise<ActionResponse<{ exportId: string; zipUrl: string }>> {
  try {
    const parsed = StartLabExitKitInputSchema.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'INVALID_INPUT', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Verify client exists and is eligible
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id, status, name, company')
      .eq('id', parsed.data.clientId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client non trouvé', 'NOT_FOUND')
    }

    if (client.operator_id !== user.id) {
      return errorResponse('Accès interdit', 'FORBIDDEN')
    }

    if (client.status === 'archived_lab') {
      return errorResponse('Client déjà archivé Lab', 'ALREADY_ARCHIVED')
    }

    // Check dashboard_type is 'lab'
    const { data: config } = await supabase
      .from('client_configs')
      .select('dashboard_type, graduated_at')
      .eq('client_id', parsed.data.clientId)
      .single()

    if (config?.dashboard_type !== 'lab') {
      return errorResponse('Ce client n\'est pas en parcours Lab', 'NOT_LAB_CLIENT')
    }

    if (config?.graduated_at) {
      return errorResponse('Ce client a déjà gradué — utilisez le kit de sortie One (Story 13.1)', 'ALREADY_GRADUATED')
    }

    // Step 1: Extract documents
    const docsResult = await exportLabDocuments(parsed.data.clientId)
    const files = docsResult.data?.files ?? []

    // Step 2: Extract briefs + PRD
    const briefsResult = await exportLabBriefs(parsed.data.clientId)
    const briefs = briefsResult.data?.briefs ?? []
    const prd = briefsResult.data?.prd ?? null

    // Step 3: Extract Élio chats
    const chatsResult = await exportLabChats(parsed.data.clientId)
    const chats = chatsResult.data?.chats ?? []

    // Step 4: Build ZIP
    const zipBuffer = await buildLabZip({
      files,
      briefs,
      chats,
      prd,
      clientName: `${client.name} — ${client.company}`,
    })

    // Step 5: Upload to Storage + signed URL
    const uploadResult = await uploadLabExport(parsed.data.clientId, zipBuffer)
    if (uploadResult.error) {
      return errorResponse(uploadResult.error.message, uploadResult.error.code)
    }

    // Step 6: Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('client_lab_exports')
      .insert({
        client_id: parsed.data.clientId,
        zip_url: uploadResult.data!.zipUrl,
        document_count: files.length,
        brief_count: briefs.length,
        chat_count: chats.length,
        expires_at: uploadResult.data!.expiresAt,
      })
      .select('id')
      .single()

    if (exportError || !exportRecord) {
      return errorResponse(
        `Erreur création export : ${exportError?.message ?? 'Erreur inconnue'}`,
        'DB_ERROR'
      )
    }

    // Step 7: Update client status
    await supabase
      .from('clients')
      .update({ status: 'archived_lab' })
      .eq('id', parsed.data.clientId)

    revalidatePath(`/clients/${parsed.data.clientId}`)

    return successResponse({
      exportId: exportRecord.id,
      zipUrl: uploadResult.data!.zipUrl,
    })
  } catch (err) {
    return errorResponse(
      `Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
