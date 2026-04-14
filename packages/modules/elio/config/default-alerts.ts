import type { ProactiveAlert, ElioAlertsPreferences } from '../types/elio.types'

/**
 * Story 8.9c — Task 3
 * Règles d'alerte proactives par défaut pour les clients Élio One+.
 * Couverture :
 *  - Données : feuilles d'émargement manquantes, cotisations impayées
 *  - Calendrier : événements à venir, renouvellement abonnement
 *  - Activité : inactivité prolongée
 */

// Task 3.2 — Règles basées sur les données
const DATA_ALERTS: ProactiveAlert[] = [
  {
    id: 'missing_attendance_sheets',
    moduleId: 'presences',
    condition: "SELECT COUNT(*) AS count FROM courses WHERE date = CURRENT_DATE - 1 AND attendance_sheet_id IS NULL",
    message: "{count} feuilles d'émargement manquent pour les cours d'hier",
    frequency: 'daily',
    lastTriggered: null,
    enabled: true,
  },
  {
    id: 'unpaid_subscriptions',
    moduleId: 'adhesions',
    condition: "SELECT COUNT(*) AS count FROM memberships WHERE status='unpaid' AND due_date < NOW() - INTERVAL '30 days'",
    message: 'Vous avez {count} cotisations impayées depuis plus de 30 jours',
    frequency: 'weekly',
    lastTriggered: null,
    enabled: true,
  },
]

// Task 3.3 — Règles basées sur le calendrier
const CALENDAR_ALERTS: ProactiveAlert[] = [
  {
    id: 'upcoming_event',
    moduleId: 'agenda',
    condition: "SELECT event_name, COUNT(*) AS attendees_count FROM events LEFT JOIN event_registrations er ON er.event_id = events.id WHERE start_date BETWEEN NOW() AND NOW() + INTERVAL '2 days' GROUP BY event_name LIMIT 1",
    message: "Rappel : événement '{event_name}' dans 2 jours — {attendees_count} inscrits",
    frequency: 'on_event',
    lastTriggered: null,
    enabled: true,
  },
  {
    id: 'subscription_renewal',
    moduleId: 'facturation',
    condition: "SELECT COUNT(*) AS count FROM subscriptions WHERE renewal_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'",
    message: 'Votre abonnement MonprojetPro est renouvelé dans 7 jours',
    frequency: 'weekly',
    lastTriggered: null,
    enabled: true,
  },
]

// Task 3.4 — Règles basées sur l'activité
const ACTIVITY_ALERTS: ProactiveAlert[] = [
  {
    id: 'inactivity_warning',
    moduleId: 'core-dashboard',
    condition: "SELECT COUNT(*) AS count FROM auth.users WHERE id = '{client_id}' AND last_sign_in_at < NOW() - INTERVAL '14 days'",
    message: "Vous n'avez pas publié de contenu depuis 2 semaines",
    frequency: 'weekly',
    lastTriggered: null,
    enabled: true,
  },
]

export const DEFAULT_PROACTIVE_ALERTS: ProactiveAlert[] = [
  ...DATA_ALERTS,
  ...CALENDAR_ALERTS,
  ...ACTIVITY_ALERTS,
]

export const DEFAULT_ELIO_ALERTS_PREFERENCES: ElioAlertsPreferences = {
  alerts: DEFAULT_PROACTIVE_ALERTS,
  max_per_day: 3,
  sent_today: 0,
  last_reset: '1970-01-01', // Valeur neutre — le cron reset au premier run
}
