'use server'

/**
 * Suivi Hub des prises de nouvelles d'Élio One (2026-08-20).
 *
 * Pourquoi cette lecture existe : depuis que la prise de nouvelles pose une VRAIE question
 * (« tout va bien ? oui / non »), un client peut répondre « non » puis ne pas aller au bout
 * du chat. Sans surface Hub, MiKL ne le saurait jamais — un signal reçu par personne.
 * Le tableau de la page Élio One affiche donc l'état de chaque prise de nouvelles récente :
 * répondue OK, répondue « pas top », ou encore sans réponse.
 *
 * Lecture opérateur (RLS `concierge_messages_select_operator` → is_operator()). En cas
 * d'échec on retourne une liste vide plutôt qu'une erreur : ce volet est informatif, il ne
 * doit pas casser la page de pilotage.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, type ActionResponse } from '@monprojetpro/types'

export interface CheckinAnswerRow {
  id: string
  clientId: string
  clientName: string
  body: string
  sentAt: string
  answeredAt: string | null
  /** 'ok' | 'not_ok' | null (pas encore répondu) */
  answerChoice: 'ok' | 'not_ok' | null
}

const MAX_ROWS = 30

export async function listCheckinAnswers(): Promise<ActionResponse<CheckinAnswerRow[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('client_concierge_messages')
      .select('id, client_id, body, created_at, answered_at, answer_choice, clients(name)')
      .eq('dashboard_context', 'one')
      .eq('event_type', 'project_checkin')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS)

    if (error) {
      console.warn('[ELIO:CHECKIN_ANSWERS] Lecture KO — liste vide:', error.message)
      return successResponse<CheckinAnswerRow[]>([])
    }

    const rows: CheckinAnswerRow[] = (data ?? []).map((row) => {
      // La jointure Supabase renvoie soit un objet, soit un tableau selon la cardinalité
      // détectée : on normalise les deux plutôt que de parier sur l'une des formes.
      const joined = row.clients as unknown
      const clientName = Array.isArray(joined)
        ? ((joined[0] as { name?: string } | undefined)?.name ?? '—')
        : ((joined as { name?: string } | null)?.name ?? '—')

      const choice = row.answer_choice as string | null

      return {
        id: row.id as string,
        clientId: row.client_id as string,
        clientName,
        body: row.body as string,
        sentAt: row.created_at as string,
        answeredAt: (row.answered_at as string | null) ?? null,
        answerChoice: choice === 'ok' || choice === 'not_ok' ? choice : null,
      }
    })

    return successResponse<CheckinAnswerRow[]>(rows)
  } catch (err) {
    console.warn('[ELIO:CHECKIN_ANSWERS] Erreur inattendue — liste vide:', String(err))
    return successResponse<CheckinAnswerRow[]>([])
  }
}
