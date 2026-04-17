// Story 13-8 — Logique de détection des relances impayées
// Fonctions pures — testables via Vitest (pas de Deno API)

export const OVERDUE_WINDOWS = {
  1: { target: 7, margin: 2 },   // J+7 ±2
  2: { target: 14, margin: 2 },  // J+14 ±2
  3: { target: 30, margin: 2 },  // J+30 ±2
} as const

export type ReminderLevel = 1 | 2 | 3

/**
 * Calcule le nombre de jours écoulés depuis la date d'émission de la facture.
 */
export function getDaysSince(invoiceDateStr: string, today: string): number {
  const invoiceDate = new Date(invoiceDateStr)
  const todayDate = new Date(today)
  const diffMs = todayDate.getTime() - invoiceDate.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Retourne le niveau de relance (1/2/3) selon les jours écoulés.
 * Fenêtres : J+7 ±2, J+14 ±2, J+30 ±2.
 * Retourne null si hors fenêtre.
 * Tri numérique explicite pour éviter toute ambiguïté sur l'ordre d'itération.
 */
export function getReminderLevel(daysSince: number): ReminderLevel | null {
  const sortedEntries = (Object.entries(OVERDUE_WINDOWS) as [string, { target: number; margin: number }][])
    .sort(([a], [b]) => Number(a) - Number(b))
  for (const [level, window] of sortedEntries) {
    const min = window.target - window.margin
    const max = window.target + window.margin
    if (daysSince >= min && daysSince <= max) {
      return Number(level) as ReminderLevel
    }
  }
  return null
}

/**
 * Vérifie si une relance existe déjà pour cette facture à ce niveau.
 */
export function hasExistingReminder(
  existingReminders: { invoice_id: string; reminder_level: number }[],
  invoiceId: string,
  level: ReminderLevel
): boolean {
  return existingReminders.some(
    (r) => r.invoice_id === invoiceId && r.reminder_level === level
  )
}

export interface ReminderPromptParams {
  firstName: string
  communicationProfile: string | null
  level: ReminderLevel
  daysOverdue: number
  invoiceNumber: string
  amount: number
  invoiceDate: string
}

/**
 * Construit le prompt système et le message pour Élio.
 */
/** Sanitise une chaîne pour l'injection dans un prompt (supprime newlines, limite longueur). */
function sanitizeForPrompt(str: string, maxLen: number): string {
  return str.replace(/[\n\r\t]/g, ' ').trim().slice(0, maxLen)
}

export function buildReminderPrompt(params: ReminderPromptParams): {
  systemPrompt: string
  message: string
} {
  const profile = params.communicationProfile ?? 'Standard, professionnel'

  // Sanitisation anti-injection pour les valeurs venant de sources externes
  const safeName = sanitizeForPrompt(params.firstName, 50)
  const safeProfile = sanitizeForPrompt(profile, 200)
  const safeInvoiceNumber = sanitizeForPrompt(params.invoiceNumber, 30)
  const safeDate = sanitizeForPrompt(params.invoiceDate, 20)

  const systemPrompt = `Tu es l'assistant de MiKL (consultant MonprojetPro).
Génère un email de relance pour une facture impayée.

Contexte client :
- Prénom : ${safeName}
- Profil communication : ${safeProfile}
- Niveau relance : ${params.level} (${params.daysOverdue} jours de retard)

Facture :
- Numéro : ${safeInvoiceNumber}
- Montant : ${params.amount}€
- Date émission : ${safeDate}

Contraintes :
- Ton adapté au profil de communication du client
- Niveau 1 (J+7) : rappel doux, bienveillant
- Niveau 2 (J+14) : plus direct, professionnel
- Niveau 3 (J+30) : ferme mais respectueux
- Signé "MiKL"
- Maximum 5 phrases
- Pas de formule juridique`

  const message = `Génère le corps de l'email de relance niveau ${params.level} pour ${safeName}.`

  return { systemPrompt, message }
}

/**
 * Construit une description textuelle du profil de communication.
 */
export function formatCommunicationProfile(profile: {
  preferred_tone: string
  preferred_length: string
  interaction_style: string
} | null): string | null {
  if (!profile) return null
  const toneMap: Record<string, string> = {
    formal: 'formel',
    casual: 'décontracté',
    technical: 'technique',
    friendly: 'amical',
  }
  const lengthMap: Record<string, string> = {
    concise: 'concis',
    detailed: 'détaillé',
    balanced: 'équilibré',
  }
  return `Ton ${toneMap[profile.preferred_tone] ?? profile.preferred_tone}, style ${lengthMap[profile.preferred_length] ?? profile.preferred_length}`
}
