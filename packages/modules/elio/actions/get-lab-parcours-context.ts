'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'

/**
 * Construit un résumé textuel léger de l'état du parcours Lab d'un client, destiné
 * au system prompt d'Élio le Concierge (chemin assistant Lab dans send-to-elio).
 *
 * Objectif : le Concierge sait « où en est » le client (étape en cours, progression,
 * agents en pause) pour répondre sans halluciner. Volontairement minimal — pas la
 * dérivation complète de get-parcours (soumissions, statuts visuels). Les modules ne
 * s'important pas entre eux (règle d'archi) → on requête directement Supabase.
 *
 * Retourne null si le client n'a pas de parcours (rien à injecter).
 */
export async function getLabParcoursContext(clientId: string): Promise<string | null> {
  if (!clientId) return null

  try {
    const supabase = await createServerSupabaseClient()

    // Agents du parcours (nouveau système Hub) — résumé minimal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agents } = await (supabase as any)
      .from('client_parcours_agents')
      .select('step_order, step_label, status, is_enabled')
      .eq('client_id', clientId)
      .order('step_order', { ascending: true }) as {
        data: Array<{ step_order: number; step_label: string; status: string; is_enabled: boolean | null }> | null
      }

    if (!agents || agents.length === 0) return null

    // Flag global de pause des agents du parcours (≠ Élio Concierge, qui reste dispo).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cfg } = await (supabase as any)
      .from('client_configs')
      .select('elio_lab_enabled, parcours_mode')
      .eq('client_id', clientId)
      .maybeSingle() as { data: { elio_lab_enabled: boolean | null; parcours_mode: string | null } | null }

    const agentsPaused = cfg?.elio_lab_enabled === false
    const isLibre = cfg?.parcours_mode === 'libre'

    // Les agents désactivés (is_enabled=false) ne comptent pas dans la progression.
    const enabled = agents.filter((a) => a.is_enabled !== false)
    const total = enabled.length
    const completed = enabled.filter((a) => a.status === 'completed').length
    const current = enabled.find((a) => a.status === 'active' || a.status === 'pending_review') ?? null
    const allCompleted = total > 0 && completed === total

    const lines: string[] = []
    lines.push(
      isLibre
        ? '- Mode du parcours : LIBRE (toutes les étapes activées sont ouvertes ; le client avance dans l\'ordre qu\'il veut, en parallèle s\'il le souhaite).'
        : '- Mode du parcours : TRACÉ (séquentiel : une étape à la fois, la suivante se débloque à la validation par MiKL).'
    )
    lines.push(`- Progression : ${completed}/${total} étape(s) terminée(s).`)

    if (current) {
      lines.push(`- Étape en cours : « ${current.step_label} ».`)
    } else if (allCompleted) {
      lines.push('- Toutes les étapes sont terminées — la graduation vers le mode One est proche.')
    }

    // Liste des étapes avec leur statut, pour répondre à « où j'en suis ? ».
    const statusLabel = (s: string): string => {
      switch (s) {
        case 'completed': return 'terminée'
        case 'active': return 'en cours'
        case 'pending_review': return 'en attente de validation MiKL'
        case 'skipped': return 'passée'
        default: return 'à venir'
      }
    }
    const stepsList = enabled
      .map((a, i) => `${i + 1}. ${a.step_label} (${statusLabel(a.status)})`)
      .join(' · ')
    if (stepsList) {
      lines.push(`- Étapes : ${stepsList}.`)
    }

    if (agentsPaused) {
      lines.push(
        '- ⚠️ Les agents du parcours sont actuellement EN PAUSE (suspendus par MiKL). Le client garde l\'accès en lecture à son parcours et à son historique, mais les agents ne répondent pas. Moi, le Concierge, je reste disponible. La réactivation est une décision de MiKL.'
      )
    }

    return lines.join('\n')
  } catch (err) {
    // Un échec de récupération du contexte parcours ne doit jamais casser le chat.
    console.error('[ELIO:LAB_PARCOURS_CONTEXT] Failed:', err)
    return null
  }
}
