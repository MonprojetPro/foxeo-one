'use server'

import { z } from 'zod'
import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseConfigValue(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return value }
  }
  return String(value)
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ConfigureGoogleDriveSchema = z.object({
  accessToken: z.string().min(1, 'Access token requis'),
  refreshToken: z.string().min(1, 'Refresh token requis'),
  folderId: z.string().min(1, 'ID du dossier Drive requis'),
})

const UpdateFolderSchema = z.object({
  folderId: z.string().min(1, 'ID du dossier Drive requis'),
})

// ============================================================
// configureGoogleDrive — stocke les tokens OAuth + folder ID
// dans system_config (upsert atomique par batch)
// Réservé aux opérateurs (is_operator())
// ============================================================

export async function configureGoogleDrive(
  accessToken: string,
  refreshToken: string,
  folderId: string
): Promise<ActionResponse<{ configured: boolean }>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const parsed = ConfigureGoogleDriveSchema.safeParse({ accessToken, refreshToken, folderId })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const { error: upsertError } = await supabase
    .from('system_config')
    .upsert(
      [
        { key: 'google_drive_access_token', value: JSON.stringify(accessToken) },
        { key: 'google_drive_refresh_token', value: JSON.stringify(refreshToken) },
        { key: 'google_drive_folder_id', value: JSON.stringify(folderId) },
      ],
      { onConflict: 'key' }
    )

  if (upsertError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la sauvegarde de la configuration Drive',
        code: 'DB_ERROR',
        details: { message: upsertError.message },
      },
    }
  }

  return { data: { configured: true }, error: null }
}

// ============================================================
// updateGoogleDriveFolderId — met à jour uniquement le folder ID
// (ne requiert pas de re-saisir les tokens)
// ============================================================

export async function updateGoogleDriveFolderId(
  folderId: string
): Promise<ActionResponse<{ configured: boolean }>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const parsed = UpdateFolderSchema.safeParse({ folderId })
  if (!parsed.success) {
    return {
      data: null,
      error: {
        message: parsed.error.issues[0]?.message ?? 'Données invalides',
        code: 'VALIDATION_ERROR',
      },
    }
  }

  const { error: upsertError } = await supabase
    .from('system_config')
    .upsert({ key: 'google_drive_folder_id', value: JSON.stringify(folderId) }, { onConflict: 'key' })

  if (upsertError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la sauvegarde du dossier Drive',
        code: 'DB_ERROR',
        details: { message: upsertError.message },
      },
    }
  }

  return { data: { configured: true }, error: null }
}

// ============================================================
// getGoogleDriveStatus — retourne UNIQUEMENT le statut (configuré ou non)
// et le folderId. Ne retourne JAMAIS les tokens côté client.
// ============================================================

export async function getGoogleDriveStatus(): Promise<
  ActionResponse<{ isConfigured: boolean; folderId: string | null }>
> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data: rows, error: fetchError } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['google_drive_access_token', 'google_drive_refresh_token', 'google_drive_folder_id'])

  if (fetchError) {
    return {
      data: null,
      error: { message: 'Erreur lecture config Drive', code: 'DB_ERROR', details: { message: fetchError.message } },
    }
  }

  if (!rows || rows.length < 3) {
    return { data: { isConfigured: false, folderId: null }, error: null }
  }

  const configMap = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]))
  const hasToken = !!configMap.get('google_drive_access_token')
  const hasRefresh = !!configMap.get('google_drive_refresh_token')
  const folderId = parseConfigValue(configMap.get('google_drive_folder_id'))

  return {
    data: {
      isConfigured: hasToken && hasRefresh && !!folderId,
      folderId,
    },
    error: null,
  }
}

// ============================================================
// getRecentUploads — liste les 20 derniers uploads de justificatifs
// ============================================================

export async function getRecentUploads(): Promise<
  ActionResponse<Array<{
    id: string
    file_name: string
    file_size: number
    mime_type: string
    drive_file_id: string | null
    status: string
    error_message: string | null
    created_at: string
  }>>
> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: fetchError } = await supabase
    .from('justificatif_uploads')
    .select('id, file_name, file_size, mime_type, drive_file_id, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (fetchError) {
    return {
      data: null,
      error: { message: 'Erreur lecture uploads', code: 'DB_ERROR', details: { message: fetchError.message } },
    }
  }

  return { data: data ?? [], error: null }
}
