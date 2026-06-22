'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase/server'
import { successResponse, errorResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { createNotification, checkNotificationAllowed } from '@monprojetpro/modules-notifications'
import { CreateToolPostSchema, rowToToolPost } from '../types/tool-post.types'
import type { ToolPost, ToolPostRow } from '../types/tool-post.types'

const MAX_IMAGES = 5
const BUCKET = 'tool-screenshots'

export async function createToolPost(formData: FormData): Promise<ActionResponse<ToolPost>> {
  const supabase = await createServerSupabaseClient()

  // 1. Auth — opérateur uniquement
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) return errorResponse('Non authentifié', 'AUTH_REQUIRED')

  // Récupérer l'operator UUID (≠ auth user id)
  const { data: operatorRecord } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operatorRecord) return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
  const operatorId = operatorRecord.id as string

  // 2. Parse FormData
  const rawBody = formData.get('body')
  const rawTitle = formData.get('title')
  const rawClientId = formData.get('clientId')
  const imageFiles = formData.getAll('images').filter((f) => f instanceof File) as File[]

  // 3. Validation Zod
  const parsed = CreateToolPostSchema.safeParse({
    clientId: rawClientId,
    title: rawTitle || undefined,
    body: rawBody,
  })
  if (!parsed.success) {
    return errorResponse(
      parsed.error.errors[0]?.message ?? 'Données invalides',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }
  const { clientId, title, body } = parsed.data

  if (imageFiles.length > MAX_IMAGES) {
    return errorResponse(`Maximum ${MAX_IMAGES} images autorisées`, 'TOO_MANY_IMAGES')
  }

  // 4. Upload images vers storage
  const imagePaths: string[] = []
  for (const file of imageFiles) {
    const ext = file.name.split('.').pop() ?? 'png'
    const uniqueName = `${operatorId}/${clientId}/${crypto.randomUUID()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uniqueName, arrayBuffer, { contentType: file.type, upsert: false })
    if (uploadError) {
      // Cleanup déjà uploadées avant de retourner l'erreur
      if (imagePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(imagePaths)
      }
      return errorResponse(
        "Échec de l'upload d'une image",
        'STORAGE_UPLOAD_ERROR',
        uploadError.message
      )
    }
    imagePaths.push(uniqueName)
  }

  // 5. INSERT tool_posts
  const { data: row, error: insertError } = await supabase
    .from('tool_posts')
    .insert({
      client_id: clientId,
      operator_id: operatorId,
      title: title ?? null,
      body,
      image_paths: imagePaths,
    })
    .select()
    .single()

  if (insertError || !row) {
    // Cleanup images uploadées si l'insert échoue
    if (imagePaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(imagePaths)
    }
    return errorResponse(
      'Erreur lors de la création du post',
      'INSERT_ERROR',
      insertError?.message
    )
  }

  const toolPostRow = row as ToolPostRow

  // 6. Récupérer l'auth_user_id du client pour la notification
  const { data: clientData } = await supabase
    .from('clients')
    .select('auth_user_id, email, first_name')
    .eq('id', clientId)
    .single()

  if (clientData?.auth_user_id) {
    // 7. Notification in-app (non bloquant)
    try {
      await createNotification({
        recipientType: 'client',
        recipientId: clientData.auth_user_id as string,
        type: 'tool_update',
        title: "Nouvelle mise à jour de votre outil",
        body: title ?? "L'opérateur a publié une nouvelle mise à jour.",
        link: '/modules/suivi-outil',
      })
    } catch (notifError) {
      console.error('[suivi-outil] Erreur notification:', notifError)
    }

    // 8. Email si préférence activée (non bloquant)
    try {
      const prefs = await checkNotificationAllowed({
        recipientId: clientData.auth_user_id as string,
        recipientType: 'client',
        notificationType: 'tool_update',
      })

      if (prefs.email && clientData.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: clientData.email,
            template: 'tool-update',
            data: {
              clientName: clientData.first_name ?? '',
              body: title ?? "L'opérateur a publié une nouvelle mise à jour.",
              link: 'https://app.monprojet-pro.com/modules/suivi-outil',
            },
          },
        })
      }
    } catch (emailError) {
      console.error('[suivi-outil] Erreur envoi email:', emailError)
    }
  }

  // 9. Retour camelCase (sans signed URLs — trop coûteux à la création)
  return successResponse(rowToToolPost(toolPostRow, []))
}
