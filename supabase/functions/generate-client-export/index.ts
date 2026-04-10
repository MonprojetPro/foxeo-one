// Edge Function: generate-client-export
// Story: 9.5a — Export RGPD des données client
//
// Triggered: invoked by exportClientData Server Action after creating data_exports record
// Input: { exportId: string, clientId: string, requestedBy: 'client' | 'operator' }
//
// Steps:
// 1. UPDATE data_exports status → 'processing'
// 2. Fetch all client personal data
// 3. Generate structured JSON
// 4. Generate human-readable PDF (pdfmake-compatible JSON → plain text for MVP)
// 5. Compress JSON + PDF as ZIP
// 6. Upload ZIP to Storage bucket 'exports'
// 7. UPDATE data_exports status → 'completed', set file_path, expires_at
// 8. Create in-app notification (export_ready)
// 9. Trigger send-email Edge Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExportInput {
  exportId: string
  clientId: string
  requestedBy: 'client' | 'operator'
  /** Fichiers documentation pré-lus côté Next.js (fs non accessible en Deno Edge) */
  documentationFiles?: Record<string, string>
}

interface ClientRow {
  id: string
  name: string
  email: string
  company: string
  client_type: string
  status: string
  created_at: string
  updated_at: string
  auth_user_id: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[EXPORT:GENERATE] Missing environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: ExportInput
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { exportId, clientId, documentationFiles } = body

  if (!exportId || !clientId) {
    return new Response(
      JSON.stringify({ error: 'Missing exportId or clientId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Mark as processing
  await supabase
    .from('data_exports')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', exportId)

  try {
    // Fetch client personal information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email, company, client_type, status, created_at, updated_at, auth_user_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message ?? 'no data'}`)
    }

    // Fetch documents metadata
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, type, size, created_at, updated_at')
      .eq('client_id', clientId)
      .is('deleted_at', null)

    // Fetch chat messages
    const { data: messages } = await supabase
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    // Fetch Elio conversations
    const { data: elioConversations } = await supabase
      .from('elio_conversations')
      .select('id, dashboard_type, title, created_at, updated_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    // Fetch all Elio messages in a single batch query (avoids N+1)
    const conversationIds = (elioConversations ?? []).map((c: { id: string }) => c.id)
    let allElioMessages: Array<{ id: string; conversation_id: string; role: string; content: string; created_at: string }> = []
    if (conversationIds.length > 0) {
      const { data: msgs } = await supabase
        .from('elio_messages')
        .select('id, conversation_id, role, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true })
      allElioMessages = (msgs ?? []) as typeof allElioMessages
    }

    // Group messages by conversation
    const messagesByConversation = new Map<string, typeof allElioMessages>()
    for (const msg of allElioMessages) {
      const existing = messagesByConversation.get(msg.conversation_id) ?? []
      existing.push(msg)
      messagesByConversation.set(msg.conversation_id, existing)
    }

    const elioConversationsWithMessages = (elioConversations ?? []).map((conv: { id: string }) => ({
      ...conv,
      messages: messagesByConversation.get(conv.id) ?? [],
    }))

    // Fetch parcours (Lab)
    const { data: parcours } = await supabase
      .from('parcours')
      .select('id, status, started_at, completed_at')
      .eq('client_id', clientId)
      .maybeSingle()

    let parcoursSteps = null
    if (parcours) {
      const { data: steps } = await supabase
        .from('parcours_steps')
        .select('id, step_number, title, status, completed_at')
        .eq('parcours_id', parcours.id)
        .order('step_number', { ascending: true })
      parcoursSteps = steps ?? []
    }

    // Fetch validation requests
    const { data: validationRequests } = await supabase
      .from('validation_requests')
      .select('id, type, status, created_at, updated_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    // Fetch notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('id, type, title, body, read_at, created_at')
      .eq('recipient_id', (client as ClientRow).auth_user_id)
      .eq('recipient_type', 'client')
      .order('created_at', { ascending: true })

    // Fetch billing data (Epic 11)
    const { data: billingSync } = await supabase
      .from('billing_sync')
      .select('entity_type, pennylane_id, status, amount, data, last_synced_at')
      .contains('data', { client_id: clientId })
      .order('last_synced_at', { ascending: true })

    // Fetch consents
    const { data: consents } = await supabase
      .from('consents')
      .select('id, consent_type, accepted, version, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    // Fetch sessions (AC #2 item 9 — historique des connexions)
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('id, device_name, device_type, ip_address, last_active_at, created_at')
      .eq('user_id', (client as ClientRow).auth_user_id)
      .order('created_at', { ascending: true })

    // Build structured JSON export
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const exportData = {
      export_metadata: {
        client_id: clientId,
        export_id: exportId,
        generated_at: now,
        expires_at: expiresAt,
        format_version: '1.0',
      },
      personal_information: {
        name: (client as ClientRow).name,
        email: (client as ClientRow).email,
        company: (client as ClientRow).company,
        client_type: (client as ClientRow).client_type,
        status: (client as ClientRow).status,
        created_at: (client as ClientRow).created_at,
        last_activity: (client as ClientRow).updated_at,
      },
      documents: documents ?? [],
      communications: {
        chat_messages: messages ?? [],
        elio_conversations: elioConversationsWithMessages,
      },
      parcours_lab: parcours
        ? {
            status: parcours.status,
            started_at: parcours.started_at,
            completed_at: parcours.completed_at,
            steps: parcoursSteps ?? [],
          }
        : null,
      validation_requests: validationRequests ?? [],
      notifications: notifications ?? [],
      consents: consents ?? [],
      sessions: (sessions ?? []).map((s: { id: string; device_name: string | null; device_type: string | null; ip_address: string | null; last_active_at: string; created_at: string }) => ({
        id: s.id,
        device_name: s.device_name,
        device_type: s.device_type,
        ip_address: s.ip_address,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
      })),
      billing: (billingSync ?? []).map((b: { entity_type: string; pennylane_id: string; status: string; amount: number | null; data: Record<string, unknown> | null; last_synced_at: string }) => ({
        type: b.entity_type,
        pennylane_id: b.pennylane_id,
        status: b.status,
        amount_eur: b.amount != null ? Math.round(b.amount) / 100 : null,
        label: (b.data?.label as string | null) ?? null,
        last_synced_at: b.last_synced_at,
      })),
    }

    const jsonContent = JSON.stringify(exportData, null, 2)

    // Generate simple PDF-like text document (pdfmake MVP equivalent)
    const pdfText = generateReadableText(exportData)

    // Construire la liste des fichiers du ZIP (données + documentation)
    const zipFiles: Array<{ name: string; content: string }> = [
      { name: 'data-export.json', content: jsonContent },
      { name: 'data-export.txt', content: pdfText },
    ]

    // Ajouter les fichiers de documentation si fournis par le Server Action
    if (documentationFiles && typeof documentationFiles === 'object') {
      for (const [filePath, fileContent] of Object.entries(documentationFiles)) {
        if (typeof fileContent === 'string' && fileContent.trim()) {
          zipFiles.push({ name: filePath, content: fileContent })
        }
      }
    }

    // Create a simple ZIP using manual binary construction
    const zipBuffer = await createSimpleZip(zipFiles)

    const filePath = `${clientId}/${exportId}.zip`

    // Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(filePath, zipBuffer, {
        contentType: 'application/zip',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Update data_exports record as completed
    const { error: updateError } = await supabase
      .from('data_exports')
      .update({
        status: 'completed',
        file_path: filePath,
        file_size_bytes: zipBuffer.byteLength,
        expires_at: expiresAt,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', exportId)

    if (updateError) {
      throw new Error(`Failed to update export record: ${updateError.message}`)
    }

    // Create in-app notification for the client
    // Use absolute Hub URL so the link works from any dashboard (client/lab/one)
    const hubUrl = Deno.env.get('HUB_URL') || supabaseUrl?.replace('.supabase.co', '') || ''
    const downloadLink = `${hubUrl}/api/exports/${exportId}/download`
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        recipient_type: 'client',
        recipient_id: (client as ClientRow).auth_user_id,
        type: 'export_ready',
        title: 'Votre export de données est prêt !',
        body: 'Vos données personnelles sont disponibles au téléchargement. Le lien expire dans 7 jours.',
        link: downloadLink,
      })

    if (notifError) {
      console.error('[EXPORT:GENERATE] Notification insert error:', notifError)
      // Don't fail — export is ready, notification is best-effort
    }

    // Trigger email notification
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: (client as ClientRow).email,
        template: 'export-ready',
        data: {
          clientName: (client as ClientRow).name,
          downloadLink,
          expiresAt,
        },
      },
    })

    if (emailError) {
      console.error('[EXPORT:GENERATE] Email error:', emailError)
      // Don't fail
    }

    console.log(`[EXPORT:GENERATE] Export completed for client ${clientId}, export ${exportId}`)

    return new Response(
      JSON.stringify({ success: true, exportId, filePath }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[EXPORT:GENERATE] Error:', error)

    // Mark as failed
    await supabase
      .from('data_exports')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', exportId)

    return new Response(
      JSON.stringify({ error: 'Export generation failed', details: error instanceof Error ? error.message : 'Unknown' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Generate human-readable text document
interface ExportData {
  export_metadata: { generated_at: string; expires_at: string; format_version: string }
  personal_information: { name: string; email: string; company: string; client_type: string; status: string; created_at: string }
  documents: Array<{ name: string; type: string; created_at: string }>
  communications: {
    chat_messages: Array<{ sender_type: string; content: string; created_at: string }>
    elio_conversations: Array<{ title: string | null; dashboard_type: string; messages: unknown[] }>
  }
  consents: Array<{ consent_type: string; accepted: boolean; version: string; created_at: string }>
  sessions: Array<{ device_name: string | null; device_type: string | null; ip_address: string | null; created_at: string }>
}

function generateReadableText(data: ExportData): string {
  const lines: string[] = [
    '=========================================',
    'EXPORT DE DONNÉES PERSONNELLES MONPROJETPRO',
    '=========================================',
    '',
    `Généré le : ${new Date(data.export_metadata.generated_at).toLocaleString('fr-FR')}`,
    `Expire le : ${new Date(data.export_metadata.expires_at).toLocaleString('fr-FR')}`,
    `Version : ${data.export_metadata.format_version}`,
    '',
    '--- INFORMATIONS PERSONNELLES ---',
    `Nom : ${data.personal_information.name}`,
    `Email : ${data.personal_information.email}`,
    `Entreprise : ${data.personal_information.company}`,
    `Type de client : ${data.personal_information.client_type}`,
    `Statut : ${data.personal_information.status}`,
    `Date d'inscription : ${data.personal_information.created_at}`,
    '',
    `--- DOCUMENTS (${data.documents.length}) ---`,
    ...data.documents.map((d: { name: string; type: string; created_at: string }) =>
      `- ${d.name} [${d.type}] (${new Date(d.created_at).toLocaleDateString('fr-FR')})`
    ),
    '',
    `--- MESSAGES CHAT (${data.communications.chat_messages.length}) ---`,
    ...data.communications.chat_messages.map((m: { sender_type: string; content: string; created_at: string }) =>
      `[${new Date(m.created_at).toLocaleDateString('fr-FR')}] ${m.sender_type}: ${m.content}`
    ),
    '',
    `--- CONVERSATIONS ÉLIO (${data.communications.elio_conversations.length}) ---`,
    ...data.communications.elio_conversations.map((c: { title: string; dashboard_type: string; messages: unknown[] }) =>
      `- ${c.title ?? 'Sans titre'} [${c.dashboard_type}] — ${c.messages.length} message(s)`
    ),
    '',
    `--- CONSENTEMENTS (${data.consents.length}) ---`,
    ...data.consents.map((c: { consent_type: string; accepted: boolean; version: string; created_at: string }) =>
      `- ${c.consent_type}: ${c.accepted ? 'Accepté' : 'Refusé'} (v${c.version}) le ${new Date(c.created_at).toLocaleDateString('fr-FR')}`
    ),
    '',
    `--- SESSIONS (${data.sessions.length}) ---`,
    ...data.sessions.map((s) =>
      `- ${s.device_name ?? 'Appareil inconnu'} [${s.device_type ?? '?'}] — IP: ${s.ip_address ?? 'N/A'} (${new Date(s.created_at).toLocaleDateString('fr-FR')})`
    ),
    '',
    '=========================================',
    'MonprojetPro — Conformité RGPD Art. 15',
    '=========================================',
  ]

  return lines.join('\n')
}

// Create a minimal ZIP archive (PKZIP format)
async function createSimpleZip(
  files: Array<{ name: string; content: string }>
): Promise<Uint8Array> {
  // Encode files as text
  const encoder = new TextEncoder()
  const entries: Array<{
    name: Uint8Array
    data: Uint8Array
    crc32: number
    offset: number
  }> = []

  let offset = 0
  const localHeaders: Uint8Array[] = []
  const centralDirs: Uint8Array[] = []

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = encoder.encode(file.content)
    const crc = computeCrc32(dataBytes)

    // Local file header (30 bytes + name + data)
    const localHeader = new Uint8Array(30 + nameBytes.length + dataBytes.length)
    const lhView = new DataView(localHeader.buffer)

    lhView.setUint32(0, 0x04034b50, true) // Signature
    lhView.setUint16(4, 20, true)           // Version needed
    lhView.setUint16(6, 0, true)            // Flags
    lhView.setUint16(8, 0, true)            // Compression: stored
    lhView.setUint16(10, 0, true)           // Mod time
    lhView.setUint16(12, 0, true)           // Mod date
    lhView.setUint32(14, crc, true)         // CRC-32
    lhView.setUint32(18, dataBytes.length, true) // Compressed size
    lhView.setUint32(22, dataBytes.length, true) // Uncompressed size
    lhView.setUint16(26, nameBytes.length, true) // Name length
    lhView.setUint16(28, 0, true)           // Extra length

    localHeader.set(nameBytes, 30)
    localHeader.set(dataBytes, 30 + nameBytes.length)

    entries.push({ name: nameBytes, data: dataBytes, crc32: crc, offset })
    localHeaders.push(localHeader)
    offset += localHeader.length
  }

  // Central directory entries
  for (const entry of entries) {
    const cd = new Uint8Array(46 + entry.name.length)
    const cdView = new DataView(cd.buffer)

    cdView.setUint32(0, 0x02014b50, true)  // Central dir signature
    cdView.setUint16(4, 20, true)           // Version made
    cdView.setUint16(6, 20, true)           // Version needed
    cdView.setUint16(8, 0, true)            // Flags
    cdView.setUint16(10, 0, true)           // Compression
    cdView.setUint16(12, 0, true)           // Mod time
    cdView.setUint16(14, 0, true)           // Mod date
    cdView.setUint32(16, entry.crc32, true) // CRC-32
    cdView.setUint32(20, entry.data.length, true) // Compressed size
    cdView.setUint32(24, entry.data.length, true) // Uncompressed size
    cdView.setUint16(28, entry.name.length, true) // Name length
    cdView.setUint16(30, 0, true)           // Extra length
    cdView.setUint16(32, 0, true)           // Comment length
    cdView.setUint16(34, 0, true)           // Disk start
    cdView.setUint16(36, 0, true)           // Internal attrs
    cdView.setUint32(38, 0, true)           // External attrs
    cdView.setUint32(42, entry.offset, true) // Local header offset

    cd.set(entry.name, 46)
    centralDirs.push(cd)
  }

  const centralDirSize = centralDirs.reduce((sum, cd) => sum + cd.length, 0)
  const centralDirOffset = offset

  // End of central directory
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)  // EOCD signature
  eocdView.setUint16(4, 0, true)           // Disk number
  eocdView.setUint16(6, 0, true)           // Disk with central dir
  eocdView.setUint16(8, entries.length, true)  // Entries on disk
  eocdView.setUint16(10, entries.length, true) // Total entries
  eocdView.setUint32(12, centralDirSize, true) // Central dir size
  eocdView.setUint32(16, centralDirOffset, true) // Central dir offset
  eocdView.setUint16(20, 0, true)          // Comment length

  // Concatenate all parts
  const totalSize = localHeaders.reduce((sum, h) => sum + h.length, 0)
    + centralDirSize + eocd.length

  const result = new Uint8Array(totalSize)
  let pos = 0

  for (const lh of localHeaders) {
    result.set(lh, pos)
    pos += lh.length
  }
  for (const cd of centralDirs) {
    result.set(cd, pos)
    pos += cd.length
  }
  result.set(eocd, pos)

  return result
}

// CRC-32 computation — table cached once
const CRC32_TABLE = makeCrc32Table()

function computeCrc32(data: Uint8Array): number {
  const table = CRC32_TABLE
  let crc = 0xffffffff

  for (const byte of data) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }
  return table
}
