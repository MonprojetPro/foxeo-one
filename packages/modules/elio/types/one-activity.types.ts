/**
 * Types — Vue Hub « Activité Élio One » (lot 4).
 *
 * Fichier de types PUR (pas de 'use server') : il peut donc exporter des types
 * et des valeurs sans risque, et être importé aussi bien par l'action serveur
 * `get-one-activity.ts` que par le composant client `activite-section.tsx`.
 *
 * ⚠️ Agrégats RÉELS uniquement. Le chat Élio One est ÉPHÉMÈRE (aucun message
 * persisté) : cette vue ne peut PAS exposer de verbatim ni de feedback One.
 * Elle agrège uniquement ce qui est réellement mesuré en base :
 *  • escalades  → `notifications` type='elio_escalation' (clientId lu dans `link`)
 *  • évolutions → `validation_requests` type='evolution_one'
 *  • tokens/coût → `elio_token_usage` (client_id)
 */

export interface OneActivityRow {
  clientId: string
  clientName: string
  /** Nb d'escalades Élio One → MiKL (notifications type='elio_escalation'). */
  escalations: number
  /** Nb de demandes d'évolution soumises depuis One (validation_requests type='evolution_one'). */
  evolutionRequests: number
  /** Tokens d'entrée cumulés (elio_token_usage). */
  inputTokens: number
  /** Tokens de sortie cumulés (elio_token_usage). */
  outputTokens: number
  /** Coût cumulé en euros (elio_token_usage.cost_eur). */
  costEur: number
}

/** Une escalade brute exploitable : le clientId est extrait du champ `link`. */
export interface RawEscalation {
  link: string | null
}

/** Une demande d'évolution brute (validation_requests). */
export interface RawEvolutionRequest {
  client_id: string | null
}

/** Une ligne brute de consommation tokens (elio_token_usage). */
export interface RawTokenRow {
  client_id: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_eur: number | null
}

/** Un client gradué (id + nom) servant de base d'agrégation. */
export interface GraduatedClientBase {
  id: string
  name: string
}

/**
 * Extrait le clientId d'un lien d'escalade Élio One.
 * Les escalades posent `link = /modules/crm/clients/{clientId}?tab=echanges`
 * (cf. escalate-to-mikl.ts) — le clientId y est donc littéralement présent.
 * Retourne null si le lien ne correspond pas au pattern attendu.
 */
export function extractClientIdFromEscalationLink(link: string | null): string | null {
  if (!link) return null
  const match = link.match(/\/modules\/crm\/clients\/([0-9a-fA-F-]{8,})/)
  return match?.[1] ?? null
}

/**
 * Agrégation PURE et testable de l'activité One par client gradué.
 *
 * On part de la liste des clients gradués (source de vérité des lignes affichées)
 * puis on y rattache les compteurs réels. Un client sans activité apparaît avec
 * des compteurs à 0 (RÉEL — pas d'invention). Les activités rattachées à un
 * clientId hors de la liste des gradués sont ignorées (client non gradué / supprimé).
 */
export function aggregateOneActivity(
  graduatedClients: GraduatedClientBase[],
  escalations: RawEscalation[],
  evolutionRequests: RawEvolutionRequest[],
  tokenRows: RawTokenRow[],
): OneActivityRow[] {
  // Initialise une ligne par client gradué (compteurs à 0).
  const rows = new Map<string, OneActivityRow>()
  for (const c of graduatedClients) {
    rows.set(c.id, {
      clientId: c.id,
      clientName: c.name,
      escalations: 0,
      evolutionRequests: 0,
      inputTokens: 0,
      outputTokens: 0,
      costEur: 0,
    })
  }

  // Escalades — clientId extrait du link.
  for (const e of escalations) {
    const clientId = extractClientIdFromEscalationLink(e.link)
    if (!clientId) continue
    const row = rows.get(clientId)
    if (row) row.escalations += 1
  }

  // Demandes d'évolution.
  for (const r of evolutionRequests) {
    if (!r.client_id) continue
    const row = rows.get(r.client_id)
    if (row) row.evolutionRequests += 1
  }

  // Consommation tokens.
  for (const t of tokenRows) {
    if (!t.client_id) continue
    const row = rows.get(t.client_id)
    if (!row) continue
    row.inputTokens += t.input_tokens ?? 0
    row.outputTokens += t.output_tokens ?? 0
    row.costEur += Number(t.cost_eur ?? 0)
  }

  // Tri : les plus actifs d'abord (escalades + évolutions + tokens), puis nom.
  return Array.from(rows.values()).sort((a, b) => {
    const scoreA = a.escalations + a.evolutionRequests + a.inputTokens + a.outputTokens
    const scoreB = b.escalations + b.evolutionRequests + b.inputTokens + b.outputTokens
    if (scoreB !== scoreA) return scoreB - scoreA
    return a.clientName.localeCompare(b.clientName)
  })
}
