/**
 * Suggestions Élio de l'accueil Hub — logique pure (testable sans Supabase).
 *
 * Transforme les données brutes (impayés, vieilles validations, parcours
 * stagnants, clients silencieux) en une liste ordonnée d'alertes affichables,
 * selon les seuils `elio_alert_thresholds` (configurables sur /elio/hub).
 *
 * Priorité (chantier Élio Hub — T5) : impayés > validations > stagnants > silencieux.
 * Limite : les 5 plus importantes.
 */

export interface StagnantParcoursClient {
  clientId: string
  clientName: string
  /** Nombre d'étapes actives sans progression. */
  stepsCount: number
  /** Ancienneté (jours) de l'étape la plus stagnante. */
  inactiveDays: number
}

export interface SilentClient {
  clientId: string
  clientName: string
  /** null = aucun message jamais échangé. */
  silentDays: number | null
}

export interface ElioSuggestionInput {
  unpaid: { count: number; amountEur: number }
  oldValidations: { count: number; oldestDays: number }
  stagnantParcours: StagnantParcoursClient[]
  silentClients: SilentClient[]
}

export interface ElioSuggestion {
  key: string
  icon: 'warning' | 'bell' | 'graduation'
  iconColor?: string
  title: string
  detail: string
  href: string
}

export const ELIO_SUGGESTIONS_LIMIT = 5

function plural(n: number, singular: string, pluralForm?: string): string {
  return n > 1 ? (pluralForm ?? `${singular}s`) : singular
}

export function buildElioSuggestions(
  input: ElioSuggestionInput,
  limit: number = ELIO_SUGGESTIONS_LIMIT,
): ElioSuggestion[] {
  const suggestions: ElioSuggestion[] = []

  // 1. Impayés (priorité max)
  if (input.unpaid.count > 0) {
    suggestions.push({
      key: 'unpaid',
      icon: 'warning',
      iconColor: 'text-destructive',
      title: 'Factures impayées',
      detail: `${input.unpaid.count} ${plural(input.unpaid.count, 'facture')} · ${Math.round(input.unpaid.amountEur).toLocaleString('fr-FR')} € en retard`,
      href: '/modules/facturation',
    })
  }

  // 2. Validations en attente depuis trop longtemps
  if (input.oldValidations.count > 0) {
    suggestions.push({
      key: 'old-validations',
      icon: 'bell',
      iconColor: 'text-primary',
      title: 'Validations qui traînent',
      detail: `${input.oldValidations.count} ${plural(input.oldValidations.count, 'demande')} en attente (la plus ancienne : ${input.oldValidations.oldestDays} j)`,
      href: '/modules/validation-hub',
    })
  }

  // 3. Parcours stagnants (un item par client, les plus anciens d'abord)
  const stagnant = [...input.stagnantParcours].sort((a, b) => b.inactiveDays - a.inactiveDays)
  for (const s of stagnant) {
    suggestions.push({
      key: `stagnant-${s.clientId}`,
      icon: 'graduation',
      iconColor: 'text-amber-400',
      title: `Parcours stagnant — ${s.clientName}`,
      detail: `${s.stepsCount} ${plural(s.stepsCount, 'étape')} sans progression depuis ${s.inactiveDays} j`,
      href: `/modules/crm/clients/${s.clientId}`,
    })
  }

  // 4. Clients silencieux (un item par client, les plus silencieux d'abord)
  const silent = [...input.silentClients].sort(
    (a, b) => (b.silentDays ?? Number.MAX_SAFE_INTEGER) - (a.silentDays ?? Number.MAX_SAFE_INTEGER),
  )
  for (const s of silent) {
    suggestions.push({
      key: `silent-${s.clientId}`,
      icon: 'bell',
      iconColor: 'text-orange-400',
      title: `Client silencieux — ${s.clientName}`,
      detail:
        s.silentDays === null
          ? 'Aucun message jamais échangé'
          : `Aucun message depuis ${s.silentDays} j`,
      href: `/modules/chat/${s.clientId}`,
    })
  }

  return suggestions.slice(0, limit)
}
