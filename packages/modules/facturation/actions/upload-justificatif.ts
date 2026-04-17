'use server'

import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadResult = {
  id: string
  fileName: string
  driveFileId: string
}

// ============================================================
// refreshAccessToken — renouvelle le token Google via refresh_token
// ============================================================

async function refreshAccessToken(
  refreshToken: string,
  supabase: Awaited<ReturnType<typeof import('@monprojetpro/supabase').createServerSupabaseClient>>
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  const newToken = data.access_token as string | undefined
  if (!newToken) return null

  // Persist the new token
  await supabase
    .from('system_config')
    .upsert({ key: 'google_drive_access_token', value: JSON.stringify(newToken) }, { onConflict: 'key' })

  return newToken
}

// ============================================================
// uploadToDrive — envoie un fichier vers Google Drive (multipart)
// Retourne le Drive file ID ou null en cas d'erreur
// ============================================================

async function uploadToDrive(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  accessToken: string
): Promise<{ driveFileId: string | null; status: number }> {
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })

  const boundary = '----FormBoundary' + Date.now().toString(36)
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${Buffer.from(fileBuffer).toString('base64')}\r\n` +
    `--${boundary}--`

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  if (!res.ok) {
    return { driveFileId: null, status: res.status }
  }

  const data = await res.json()
  return { driveFileId: data.id ?? null, status: res.status }
}

// ============================================================
// uploadJustificatif — Server Action principale
// Upload un fichier justificatif vers Google Drive et enregistre en DB
// Réservé aux opérateurs (is_operator())
// ============================================================

export async function uploadJustificatif(
  formData: FormData
): Promise<ActionResponse<UploadResult>> {
  const { supabase, userId, error: authError } = await assertOperator()
  if (authError || !supabase || !userId) return { data: null, error: authError }

  // Extract file from FormData
  const file = formData.get('file') as File | null
  if (!file) {
    return { data: null, error: { message: 'Aucun fichier fourni', code: 'VALIDATION_ERROR' } }
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      data: null,
      error: {
        message: 'Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG',
        code: 'INVALID_FILE_TYPE',
      },
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      data: null,
      error: { message: 'Le fichier dépasse la taille maximale de 10 Mo', code: 'FILE_TOO_LARGE' },
    }
  }

  // Read Google Drive config from system_config
  const { data: configRows, error: configError } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['google_drive_access_token', 'google_drive_refresh_token', 'google_drive_folder_id'])

  if (configError || !configRows || configRows.length < 3) {
    return {
      data: null,
      error: { message: 'Google Drive non configuré. Veuillez configurer la connexion Drive.', code: 'DRIVE_NOT_CONFIGURED' },
    }
  }

  const configMap = new Map(configRows.map((r: { key: string; value: unknown }) => [r.key, r.value]))
  let accessToken = parseConfigValue(configMap.get('google_drive_access_token'))
  const refreshToken = parseConfigValue(configMap.get('google_drive_refresh_token'))
  const folderId = parseConfigValue(configMap.get('google_drive_folder_id'))

  if (!accessToken || !refreshToken || !folderId) {
    return {
      data: null,
      error: { message: 'Configuration Google Drive incomplète', code: 'DRIVE_NOT_CONFIGURED' },
    }
  }

  // Sanitize filename (leçon DL-002)
  const sanitizedName = file.name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  const fileBuffer = await file.arrayBuffer()

  // First attempt
  let result = await uploadToDrive(fileBuffer, sanitizedName, file.type, folderId, accessToken)

  // If 401, refresh token and retry once
  if (result.status === 401) {
    const newToken = await refreshAccessToken(refreshToken, supabase)
    if (newToken) {
      accessToken = newToken
      result = await uploadToDrive(fileBuffer, sanitizedName, file.type, folderId, accessToken)
    }
  }

  // Insert upload record in DB
  const uploadRecord = {
    uploaded_by: userId,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    drive_file_id: result.driveFileId,
    status: result.driveFileId ? 'sent' : 'error',
    error_message: result.driveFileId ? null : `Erreur Google Drive (HTTP ${result.status})`,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('justificatif_uploads')
    .insert(uploadRecord)
    .select('id')
    .single()

  if (insertError) {
    return {
      data: null,
      error: {
        message: 'Fichier envoyé à Drive mais erreur d\'enregistrement en base',
        code: 'DB_ERROR',
        details: { message: insertError.message },
      },
    }
  }

  if (!result.driveFileId) {
    return {
      data: null,
      error: { message: uploadRecord.error_message ?? 'Erreur upload Google Drive', code: 'DRIVE_UPLOAD_FAILED' },
    }
  }

  return {
    data: {
      id: inserted.id,
      fileName: file.name,
      driveFileId: result.driveFileId,
    },
    error: null,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseConfigValue(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return value }
  }
  return String(value)
}
