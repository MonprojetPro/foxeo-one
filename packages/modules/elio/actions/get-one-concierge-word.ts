'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
// import TYPE only (effacé à la compilation → aucun couplage runtime ni cycle de barrel).
import type { ConciergeWord } from '@monprojetpro/module-parcours'

/**
 * Lit « le dernier mot d'Élio le Concierge » côté ONE pour un client : la row la plus
 * récente de `client_concierge_messages` avec `dashboard_context='one'`.
 *
 * Pendant Lab : la lecture symétrique vit dans get-parcours (filtrée dashboard_context='lab').
 * Ici on isole strictement le contexte One pour que les deux bandeaux ne se mélangent jamais.
 *
 * Retourne `null` s'il n'y a aucun mot One (l'accueil affiche alors son état par défaut).
 * Ne throw jamais : un échec de lecture renvoie null (le mot d'Élio est un « plus », jamais bloquant).
 */
export async function getOneConciergeWord(clientId: string): Promise<ConciergeWord | null> {
  if (!clientId) return null

  try {
    const supabase = await createServerSupabaseClient()

    const { data: lastWord, error } = await supabase
      .from('client_concierge_messages')
      .select('body, event_type, agent_label, created_at')
      .eq('client_id', clientId)
      .eq('dashboard_context', 'one')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !lastWord) return null

    return {
      body: lastWord.body as string,
      eventType: lastWord.event_type as string,
      agentLabel: (lastWord.agent_label as string | null) ?? null,
      createdAt: lastWord.created_at as string,
    }
  } catch (err) {
    console.error('[ELIO:GET_ONE_CONCIERGE_WORD] Failed (ignored):', err)
    return null
  }
}
