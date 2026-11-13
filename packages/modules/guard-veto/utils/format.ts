import type { EquipeCabinet, EtatCompte, PeriodeGarde } from '../types'

/** Date courte, ou « — » quand on ne sait pas. Jamais « jamais » par défaut : on ne sait pas. */
export function formatJour(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso))
}

export function formatJourHeure(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/**
 * Phrase d'équipe. `null` veut dire « on n'a pas pu lire », pas « zéro » :
 * la distinction doit survivre jusqu'à l'écran.
 */
export function libelleEquipe(equipe: EquipeCabinet | null): string {
  if (!equipe) return 'Équipe illisible'
  const bouts = [`${equipe.comptesActifs} compte(s) actif(s)`]
  if (equipe.invitationsEnAttente > 0) bouts.push(`${equipe.invitationsEnAttente} en attente`)
  if (equipe.sansCompte > 0) bouts.push(`${equipe.sansCompte} sans compte`)
  return bouts.join(' · ')
}

export function libellePeriode(p: PeriodeGarde | null): string {
  if (!p) return '—'
  return `${formatJour(p.debut)} → ${formatJour(p.fin)}`
}

/** Ce que chaque état veut dire en français, et ce qu'on peut y faire. */
export const ETATS: Record<EtatCompte, { label: string; aide: string; tone: 'emerald' | 'amber' | 'violet' | 'cyan' }> = {
  actif: {
    label: 'Actif',
    aide: 'Le compte est ouvert et utilisé.',
    tone: 'emerald',
  },
  invitation_en_attente: {
    label: 'Invitation en attente',
    aide: "L'invitation est partie, le lien n'a pas encore été ouvert.",
    tone: 'amber',
  },
  mot_de_passe_a_choisir: {
    label: 'Mot de passe à choisir',
    aide: "Le lien a été ouvert, mais aucun mot de passe n'a été défini.",
    tone: 'violet',
  },
  sans_compte: {
    label: 'Sans compte',
    aide: "La fiche existe, aucun compte n'a encore été créé.",
    tone: 'cyan',
  },
}
