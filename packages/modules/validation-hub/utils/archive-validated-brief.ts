import type { createServerSupabaseClient } from '@monprojetpro/supabase'

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

/** Ligne validation_requests (snake_case) telle que retournée par la RPC approve_validation_request. */
interface ValidatedRequestRow {
  client_id: string
  operator_id: string
  type: string
  title: string
  content: string
}

/**
 * Types de demande correspondant à un livrable de parcours à archiver dans le module Documents.
 * `step_submission` = système actif (client_parcours_agents) · `brief_lab` = ancien système.
 * `evolution_one` est exclu volontairement (ce n'est pas un livrable de parcours).
 */
const ARCHIVABLE_TYPES = new Set(['step_submission', 'brief_lab'])

/** Nettoie un nom pour Supabase Storage (qui rejette espaces/accents/caractères spéciaux). */
function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .replace(/[^a-zA-Z0-9._-]/g, '-') // remplace les caractères spéciaux
    .replace(/-{2,}/g, '-') // fusionne les tirets consécutifs
    .replace(/^-|-$/g, '') // retire les tirets en bord
}

/**
 * Archive le contenu d'un brief validé comme document Markdown partagé dans le module Documents.
 *
 * Best-effort : ne fait JAMAIS échouer la validation (toute erreur est loggée, jamais propagée).
 * Communication inter-module via Supabase (données) uniquement — pas d'import du module documents,
 * conformément à la règle d'isolation des modules.
 *
 * Le document est créé avec visibility='shared' (visible client + Hub) et uploaded_by='operator'.
 */
export async function archiveValidatedBriefAsDocument(
  supabase: SupabaseServerClient,
  request: ValidatedRequestRow,
): Promise<void> {
  try {
    if (!ARCHIVABLE_TYPES.has(request.type)) return
    if (!request.content?.trim()) return

    const title = request.title?.trim() || 'Document validé'
    const dateLabel = new Date().toISOString().slice(0, 10)
    const markdown = `# ${title}\n\n_Validé le ${dateLabel}_\n\n---\n\n${request.content}\n`
    const fileSize = Buffer.byteLength(markdown, 'utf8')

    const baseName = sanitizeFilename(title).slice(0, 80) || 'document-valide'
    const filename = `${crypto.randomUUID()}-${baseName}.md`
    const storagePath = `${request.operator_id}/${request.client_id}/${filename}`

    const blob = new Blob([markdown], { type: 'text/markdown' })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, blob, { contentType: 'text/markdown', upsert: false })

    if (uploadError) {
      console.error('[VALIDATION-HUB:ARCHIVE] Storage error:', uploadError)
      return
    }

    const { error: insertError } = await supabase.from('documents').insert({
      client_id: request.client_id,
      operator_id: request.operator_id,
      name: `${title}.md`,
      file_path: storagePath,
      file_type: 'md',
      file_size: fileSize,
      visibility: 'shared',
      uploaded_by: 'operator',
      tags: ['Parcours', 'Validé'],
    })

    if (insertError) {
      console.error('[VALIDATION-HUB:ARCHIVE] DB insert error:', insertError)
      // Nettoyage du fichier orphelin si l'insert DB échoue
      await supabase.storage.from('documents').remove([storagePath])
    }
  } catch (err) {
    console.error('[VALIDATION-HUB:ARCHIVE] Unexpected error:', err)
  }
}
