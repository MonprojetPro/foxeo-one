// API Route: /api/exports/[exportId]/download
// Story: 9.5a — Export RGPD des données client
//
// GET /api/exports/{exportId}/download
// - Verifies auth: client owner OR operator owner
// - Generates Supabase Storage signed URL (expires 1h)
// - Redirects to signed URL for download
// - Logs download in activity_logs

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

interface ExportRecord {
  id: string
  client_id: string
  requested_by: string
  requester_id: string
  status: string
  file_path: string | null
  expires_at: string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const { exportId } = await params

    if (!exportId || !/^[0-9a-f-]{36}$/.test(exportId)) {
      return NextResponse.json(
        { error: 'Invalid exportId' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Fetch export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('data_exports')
      .select('id, client_id, requested_by, requester_id, status, file_path, expires_at')
      .eq('id', exportId)
      .maybeSingle()

    if (exportError || !exportRecord) {
      return NextResponse.json({ error: 'Export introuvable' }, { status: 404 })
    }

    const record = exportRecord as ExportRecord

    // Check expiry
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Ce lien de téléchargement a expiré' }, { status: 410 })
    }

    if (record.status !== 'completed' || !record.file_path) {
      return NextResponse.json({ error: "L'export n'est pas encore prêt" }, { status: 409 })
    }

    // Verify authorization: client owner OR operator owner
    let authorized = false

    // Check if user is the client who requested the export
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('id')
      .eq('id', record.client_id)
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (clientRecord) {
      authorized = true
    }

    // Check if user is the operator who owns the client
    if (!authorized) {
      const { data: operatorRecord } = await supabase
        .from('operators')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (operatorRecord) {
        const opRec = operatorRecord as { id: string }
        const { data: ownedClient } = await supabase
          .from('clients')
          .select('id')
          .eq('id', record.client_id)
          .eq('operator_id', opRec.id)
          .maybeSingle()

        if (ownedClient) {
          authorized = true
        }
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Generate signed URL (expires in 1 hour)
    const { data: signedUrl, error: signedError } = await supabase.storage
      .from('exports')
      .createSignedUrl(record.file_path, 3600, {
        download: `monprojetpro-export-${exportId}.zip`,
      })

    if (signedError || !signedUrl?.signedUrl) {
      console.error('[EXPORT:DOWNLOAD] Signed URL error:', signedError)
      return NextResponse.json(
        { error: 'Impossible de générer le lien de téléchargement' },
        { status: 500 }
      )
    }

    // Log download in activity_logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: clientRecord ? 'client' : 'operator',
      actor_id: user.id,
      action: 'data_export_downloaded',
      entity_type: 'data_export',
      entity_id: exportId,
      metadata: { client_id: record.client_id },
    } as any)

    if (logError) {
      console.error('[EXPORT:DOWNLOAD] Activity log error:', logError)
    }

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (error) {
    console.error('[EXPORT:DOWNLOAD] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
