import type { NotificationPreferenceType } from './notification-prefs.types'

export const PREF_LABELS: Record<
  NotificationPreferenceType,
  { label: string; description: string }
> = {
  message: {
    label: 'Messages MiKL',
    description: 'Nouveaux messages de votre accompagnateur',
  },
  validation: {
    label: 'Validations Hub',
    description: 'Décisions sur vos soumissions et demandes',
  },
  alert: {
    label: 'Alertes système',
    description: 'Alertes importantes concernant votre compte',
  },
  system: {
    label: 'Notifications système',
    description: 'Informations système essentielles (non désactivable)',
  },
  graduation: {
    label: 'Graduation',
    description: 'Évolution de votre parcours (non désactivable)',
  },
  payment: {
    label: 'Paiements',
    description: 'Informations relatives à votre abonnement',
  },
  tool_update: {
    label: "Suivi de l'outil",
    description: "Mises à jour et évolutions de la plateforme MonprojetPro",
  },
  tool_comment: {
    label: 'Suivi — réactions',
    description: 'Réponses et réactions sur les mises à jour de votre outil',
  },
}
