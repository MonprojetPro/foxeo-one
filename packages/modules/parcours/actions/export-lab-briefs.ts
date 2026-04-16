'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface ExportedBrief {
  path: string
  content: string
  name: string
}

export async function exportLabBriefs(
  clientId: string
): Promise<ActionResponse<{ briefs: ExportedBrief[]; prd: string | null; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Fetch all submissions (briefs) for this client
    const { data: submissions, error: subError } = await supabase
      .from('step_submissions')
      .select('id, submission_content, status, submitted_at, parcours_step_id')
      .eq('client_id', clientId)
      .order('submitted_at', { ascending: true })
      .limit(10000)

    if (subError) {
      return errorResponse(`Erreur récupération briefs : ${subError.message}`, 'DB_ERROR')
    }

    if (!submissions || submissions.length === 0) {
      return successResponse({ briefs: [], prd: null, count: 0 })
    }

    const briefs: ExportedBrief[] = []
    const approvedContents: string[] = []

    for (const sub of submissions) {
      const date = new Date(sub.submitted_at).toISOString().split('T')[0]
      const statusLabel = sub.status === 'approved' ? 'validé' : sub.status
      const name = `brief-${date}-${sub.id.slice(0, 8)}`

      const content = [
        `# Brief — ${date}`,
        '',
        `**Statut :** ${statusLabel}`,
        `**Soumis le :** ${new Date(sub.submitted_at).toLocaleString('fr-FR')}`,
        '',
        '---',
        '',
        typeof sub.submission_content === 'string'
          ? sub.submission_content
          : JSON.stringify(sub.submission_content, null, 2),
        '',
      ].join('\n')

      briefs.push({
        path: `briefs/${name}.md`,
        content,
        name,
      })

      if (sub.status === 'approved' && sub.submission_content) {
        approvedContents.push(
          typeof sub.submission_content === 'string'
            ? sub.submission_content
            : JSON.stringify(sub.submission_content, null, 2)
        )
      }
    }

    // Compile PRD from approved briefs
    let prd: string | null = null
    if (approvedContents.length > 0) {
      prd = [
        '# PRD Consolidé — MonprojetPro Lab',
        '',
        `*Généré le ${new Date().toLocaleDateString('fr-FR')}*`,
        '',
        '---',
        '',
        ...approvedContents.map((content, i) => [
          `## Section ${i + 1}`,
          '',
          content,
          '',
        ]).flat(),
      ].join('\n')
    }

    return successResponse({ briefs, prd, count: briefs.length })
  } catch (err) {
    return errorResponse(
      `Erreur export briefs : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
