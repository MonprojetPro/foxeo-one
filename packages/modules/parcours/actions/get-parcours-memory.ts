'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

/** Longueur max retenue par document validé (garde le system prompt raisonnable en tokens). */
const MAX_CHARS_PER_STEP = 2000
/** Nombre max d'étapes injectées dans la mémoire partagée. */
const MAX_STEPS = 8

export interface ParcoursMemory {
  /** Bloc prêt à injecter dans le system prompt d'Élio. null si rien de validé ailleurs. */
  block: string | null
  /** Nombre d'étapes résumées (utile pour debug / tests). */
  stepCount: number
}

type AgentRow = { id: string; step_order: number; step_label: string | null; is_enabled: boolean }
type SubRow = { parcours_step_id: string; submission_content: string; created_at: string }

/**
 * LOT E — Mémoire partagée de parcours.
 *
 * Construit « le dossier du client » : un digest des documents DÉJÀ VALIDÉS dans les AUTRES
 * étapes du parcours, à injecter dans le cerveau de l'agent Élio de l'étape courante. Sans ça,
 * chaque agent est cloisonné (il ne lit que sa propre conversation) → en mode libre surtout, il
 * risque de redemander des infos déjà établies ailleurs. Actif dans les DEUX modes.
 *
 * @param clientId       client concerné
 * @param currentStepId  id (client_parcours_agents.id) de l'étape courante à EXCLURE du digest
 */
export async function getParcoursMemory(
  clientId: string,
  currentStepId?: string
): Promise<ActionResponse<ParcoursMemory>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Étapes du parcours (pour le label + l'ordre + exclure les désactivées).
    const { data: agentRows, error: agentError } = await supabase
      .from('client_parcours_agents')
      .select('id, step_order, step_label, is_enabled')
      .eq('client_id', clientId)
      .order('step_order', { ascending: true })

    if (agentError) {
      return errorResponse('Erreur lecture étapes', 'DB_ERROR', agentError)
    }

    const steps = (agentRows ?? []) as AgentRow[]
    const stepById = new Map(steps.map((s) => [s.id, s]))

    // Dernière soumission APPROUVÉE par étape (le document final validé par MiKL).
    const { data: subRows, error: subError } = await supabase
      .from('step_submissions')
      .select('parcours_step_id, submission_content, created_at')
      .eq('client_id', clientId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (subError) {
      return errorResponse('Erreur lecture soumissions', 'DB_ERROR', subError)
    }

    const latestByStep = new Map<string, SubRow>()
    for (const sub of (subRows ?? []) as SubRow[]) {
      if (!latestByStep.has(sub.parcours_step_id)) {
        latestByStep.set(sub.parcours_step_id, sub)
      }
    }

    // Composer le digest : étapes activées, validées, autres que l'étape courante, dans l'ordre.
    const entries: string[] = []
    for (const step of steps) {
      if (entries.length >= MAX_STEPS) break
      if (step.id === currentStepId) continue
      if (!step.is_enabled) continue
      const sub = latestByStep.get(step.id)
      if (!sub) continue

      const label = step.step_label ?? `Étape ${step.step_order}`
      let content = (sub.submission_content ?? '').trim()
      if (content.length === 0) continue
      if (content.length > MAX_CHARS_PER_STEP) {
        content = content.slice(0, MAX_CHARS_PER_STEP) + '\n[…document tronqué…]'
      }
      entries.push(`[Étape ${step.step_order} — ${label}]\n${content}`)
    }

    if (entries.length === 0) {
      return successResponse({ block: null, stepCount: 0 })
    }

    const block = `=== DOSSIER DU CLIENT (déjà établi et validé dans d'autres étapes — NE REDEMANDE PAS ces infos) ===
Le client a déjà finalisé et fait valider les éléments ci-dessous avec MiKL. Appuie-toi dessus :
- Ne repose JAMAIS une question dont la réponse figure déjà ici ; reprends ses mots et ses chiffres EXACTS.
- Assure la COHÉRENCE de cette étape avec ces éléments (ne contredis pas ce qui est déjà acté).
- Tu peux t'y référer naturellement, mais ne récite pas ce dossier au client : sers-t'en pour avancer plus vite.

${entries.join('\n\n')}
=== FIN DOSSIER ===

`

    return successResponse({ block, stepCount: entries.length })
  } catch (error) {
    console.error('[PARCOURS:GET_PARCOURS_MEMORY] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
