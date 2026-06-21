'use client'

/**
 * Registre unique des événements d'activité client.
 *
 * Source de vérité pour les libellés, icônes, onglets cibles et enrichissement
 * du metadata. Consommé par :
 *   - `get-activity-logs.ts` (serveur) → deriveDescription()
 *   - `client-timeline.tsx` (client) → rendu visuel + raccourcis
 *
 * Règle : tout nouvel événement loggé en DB doit être ajouté ici.
 */

import {
  UserPlus,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Video,
  GraduationCap,
  FileUp,
  MessageSquare,
  Pin,
  Archive,
  PauseCircle,
  PlayCircle,
  Trash2,
  ToggleLeft,
  CreditCard,
  Receipt,
  Package,
  Palette,
  Bot,
  FolderSync,
  TrendingUp,
  Settings2,
  Lock,
  Unlock,
  RotateCcw,
  Send,
  FileX,
  FileCheck,
  Upload,
  FileSpreadsheet,
  Mail,
  AlertCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface EventConfig {
  /** Label FR affiché dans la timeline. */
  label: string
  Icon: LucideIcon
  iconClass: string
  /** Valeur du paramètre `?tab=` pour le raccourci de navigation. Null = pas de raccourci. */
  tab: string | null
  /** Texte du bouton raccourci. Null = pas de bouton. */
  actionLabel: string | null
  /**
   * Enrichissement optionnel de la description à partir du metadata.
   * Si absent, `deriveDescription` utilise le label comme description par défaut.
   */
  describe?: (metadata: Record<string, unknown>) => string
}

// ---------------------------------------------------------------------------
// Résolveur par PRÉFIXE pour les actions dynamiques
// (actions dont le nom se termine par un suffixe variable ex: _libre, _tracee, _enabled…)
// ---------------------------------------------------------------------------

/**
 * Résout la config d'une action dynamique non mappée statiquement.
 * Retourne null si aucun préfixe ne correspond.
 */
export function resolveByPrefix(action: string): EventConfig | null {
  // parcours_mode_set_libre / parcours_mode_set_tracee
  if (action.startsWith('parcours_mode_set_')) {
    const mode = action.replace('parcours_mode_set_', '')
    const isLibre = mode === 'libre'
    return {
      label: `Mode de parcours → ${isLibre ? 'Libre' : 'Tracé'}`,
      Icon: Settings2,
      iconClass: 'text-violet-500 bg-violet-500/10',
      tab: 'pilote',
      actionLabel: 'Voir le cockpit',
      describe: (meta) => {
        const resynced = typeof meta.resynced === 'number' ? meta.resynced : 0
        if (resynced > 0) {
          return `Basculé en mode ${isLibre ? 'libre' : 'tracé'} — ${resynced} étape(s) resynchronisée(s)`
        }
        return `Basculé en mode ${isLibre ? 'libre' : 'tracé'}`
      },
    }
  }

  // access_lab_enabled / access_lab_disabled / access_one_enabled / access_one_disabled
  if (action.startsWith('access_')) {
    const rest = action.replace('access_', '')
    const isLab = rest.startsWith('lab')
    const isEnabled = rest.endsWith('enabled')
    const dashLabel = isLab ? 'Lab (agents Élio)' : 'One'
    return {
      label: `Accès ${dashLabel} ${isEnabled ? 'activé' : 'coupé'}`,
      Icon: isEnabled ? Unlock : Lock,
      iconClass: isEnabled
        ? 'text-green-500 bg-green-500/10'
        : 'text-orange-500 bg-orange-500/10',
      tab: 'pilote',
      actionLabel: 'Voir le cockpit',
      describe: (meta) => {
        const newType = typeof meta.newDashboardType === 'string' ? meta.newDashboardType : null
        if (newType) {
          return `Dashboard actif : ${newType === 'one' ? 'One' : 'Lab'}`
        }
        return isEnabled ? 'Accès rétabli' : 'Accès suspendu'
      },
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Registre statique
// ---------------------------------------------------------------------------

export const ACTIVITY_EVENT_CONFIG: Record<string, EventConfig> = {
  // ── Client lifecycle ──────────────────────────────────────────────────────
  client_created: {
    label: 'Client créé',
    Icon: UserPlus,
    iconClass: 'text-primary bg-primary/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_graduated: {
    label: 'Graduation vers One',
    Icon: GraduationCap,
    iconClass: 'text-primary bg-primary/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_archived: {
    label: 'Client archivé',
    Icon: Archive,
    iconClass: 'text-orange-500 bg-orange-500/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_suspended: {
    label: 'Client suspendu',
    Icon: PauseCircle,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_reactivated: {
    label: 'Client réactivé',
    Icon: PlayCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_closed: {
    label: 'Client clôturé',
    Icon: Trash2,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },
  client_upgraded: {
    label: 'Type de client mis à jour',
    Icon: TrendingUp,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'pilote',
    actionLabel: 'Voir le cockpit',
  },

  // ── Parcours ──────────────────────────────────────────────────────────────
  parcours_assigned: {
    label: 'Parcours assigné',
    Icon: FileText,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_suspended: {
    label: 'Parcours suspendu',
    Icon: PauseCircle,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_reactivated: {
    label: 'Parcours réactivé',
    Icon: PlayCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_abandoned: {
    label: 'Abandon de parcours demandé',
    Icon: AlertCircle,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const reason = typeof meta.reason === 'string' && meta.reason ? meta.reason : null
      const progression = typeof meta.progression === 'string' ? meta.progression : null
      const parts: string[] = []
      if (progression) parts.push(`Progression : ${progression}`)
      if (reason) parts.push(`Raison : ${reason}`)
      return parts.join(' — ') || 'Le client a demandé à abandonner son parcours Lab'
    },
  },

  // ── Parcours agents ───────────────────────────────────────────────────────
  parcours_agent_enabled: {
    label: 'Agent de parcours activé',
    Icon: PlayCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_agent_disabled: {
    label: 'Agent de parcours grisé',
    Icon: ToggleLeft,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
  },
  parcours_agent_reopened: {
    label: 'Étape rouverte',
    Icon: RotateCcw,
    iconClass: 'text-violet-500 bg-violet-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const reason = typeof meta.reason === 'string' && meta.reason ? meta.reason : null
      return reason ? `Raison : ${reason}` : 'MiKL a rouvert une étape pour révision'
    },
  },

  // ── Validation Hub ────────────────────────────────────────────────────────
  submission_sent: {
    label: 'Soumission envoyée par le client',
    Icon: Send,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const stepName = typeof meta.stepName === 'string' ? meta.stepName : null
      return stepName ? `Étape : ${stepName}` : 'Le client a soumis son travail pour validation'
    },
  },
  submission_approved: {
    label: 'Soumission approuvée',
    Icon: CheckCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const stepName = typeof meta.stepName === 'string' ? meta.stepName : null
      return stepName ? `Étape validée : ${stepName}` : 'MiKL a approuvé la soumission'
    },
  },
  submission_rejected: {
    label: 'Soumission refusée',
    Icon: XCircle,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const stepName = typeof meta.stepName === 'string' ? meta.stepName : null
      return stepName ? `Étape refusée : ${stepName}` : 'MiKL a refusé la soumission'
    },
  },
  submission_revision: {
    label: 'Révision demandée',
    Icon: RotateCcw,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'submissions',
    actionLabel: 'Voir les soumissions',
    describe: (meta) => {
      const stepName = typeof meta.stepName === 'string' ? meta.stepName : null
      return stepName ? `Révision sur : ${stepName}` : 'MiKL a demandé une révision'
    },
  },

  // ── Alias legacy (validation_hub actions pré-lot) ─────────────────────────
  validation_submitted: {
    label: 'Brief soumis',
    Icon: FileText,
    iconClass: 'text-blue-500 bg-blue-500/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },
  validation_approved: {
    label: 'Brief approuvé',
    Icon: CheckCircle,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },
  validation_rejected: {
    label: 'Brief refusé',
    Icon: XCircle,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'submissions',
    actionLabel: 'Voir la soumission',
  },

  // ── Modules & config ──────────────────────────────────────────────────────
  module_toggled: {
    label: 'Module modifié',
    Icon: ToggleLeft,
    iconClass: 'text-purple-500 bg-purple-500/10',
    tab: 'modules',
    actionLabel: 'Voir les modules',
  },
  tier_changed: {
    label: "Tier d'abonnement modifié",
    Icon: RefreshCw,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  branding_updated: {
    label: 'Branding personnalisé',
    Icon: Palette,
    iconClass: 'text-pink-500 bg-pink-500/10',
    tab: 'branding',
    actionLabel: 'Voir le branding',
  },
  elio_doc_injected: {
    label: 'Documentation Élio mise à jour',
    Icon: Bot,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'elio-config',
    actionLabel: 'Voir Élio',
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  document_uploaded: {
    label: 'Document importé',
    Icon: FileUp,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },
  document_shared: {
    label: 'Document partagé',
    Icon: FileUp,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },
  documents_synced: {
    label: 'Documents synchronisés (ZIP)',
    Icon: FolderSync,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: 'documents',
    actionLabel: 'Voir les documents',
  },

  // ── Facturation ───────────────────────────────────────────────────────────
  quote_created: {
    label: 'Devis créé',
    Icon: Receipt,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  quote_converted: {
    label: 'Devis converti en facture',
    Icon: FileCheck,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  quote_sent_by_email: {
    label: 'Devis envoyé par email',
    Icon: Mail,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  quote_cancelled: {
    label: 'Devis annulé',
    Icon: FileX,
    iconClass: 'text-destructive bg-destructive/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  quote_updated_via_recreate: {
    label: 'Devis recréé (mise à jour)',
    Icon: Receipt,
    iconClass: 'text-yellow-500 bg-yellow-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  subscription_created: {
    label: 'Abonnement créé',
    Icon: Package,
    iconClass: 'text-green-500 bg-green-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  credit_note_created: {
    label: 'Avoir créé',
    Icon: CreditCard,
    iconClass: 'text-orange-500 bg-orange-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },
  lab_invoice_sent: {
    label: 'Facture Lab envoyée',
    Icon: Receipt,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'lab-billing',
    actionLabel: 'Voir la facturation',
  },

  // ── Import ────────────────────────────────────────────────────────────────
  csv_import: {
    label: 'Import CSV effectué',
    Icon: FileSpreadsheet,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: null,
    actionLabel: null,
  },

  // ── Emails & comms ────────────────────────────────────────────────────────
  message_sent: {
    label: 'Message envoyé',
    Icon: MessageSquare,
    iconClass: 'text-indigo-500 bg-indigo-500/10',
    tab: 'emails',
    actionLabel: 'Voir les emails',
  },

  // ── Visio ─────────────────────────────────────────────────────────────────
  visio_completed: {
    label: 'Visio terminée',
    Icon: Video,
    iconClass: 'text-purple-500 bg-purple-500/10',
    tab: 'echanges',
    actionLabel: 'Voir les échanges',
  },

  // ── Upload/export ─────────────────────────────────────────────────────────
  lab_export_started: {
    label: 'Export Lab démarré',
    Icon: Upload,
    iconClass: 'text-cyan-500 bg-cyan-500/10',
    tab: null,
    actionLabel: null,
  },
}

/**
 * Config de fallback quand l'action n'est mappée ni statiquement ni par préfixe.
 */
export const FALLBACK_EVENT_CONFIG: EventConfig = {
  label: 'Activité',
  Icon: Pin,
  iconClass: 'text-muted-foreground bg-muted',
  tab: null,
  actionLabel: null,
}

/**
 * Résolution complète : statique → préfixe → fallback.
 */
export function resolveEventConfig(action: string): EventConfig {
  return (
    ACTIVITY_EVENT_CONFIG[action] ??
    resolveByPrefix(action) ??
    FALLBACK_EVENT_CONFIG
  )
}

/**
 * Libellé de description enrichi à partir de la config + metadata.
 * Utilisé côté serveur (get-activity-logs.ts) ET côté client (rendu timeline).
 */
export function deriveActivityDescription(
  action: string,
  metadata: Record<string, unknown> | null
): string {
  // 1) metadata.description explicite (échappatoire pour texte custom en DB)
  if (metadata?.description && typeof metadata.description === 'string') {
    return metadata.description
  }

  const config = resolveEventConfig(action)

  // 2) describe() de la config
  if (config.describe && metadata) {
    const result = config.describe(metadata)
    if (result) return result
  }

  // 3) label comme description par défaut
  return config.label
}

/**
 * Libellé de l'acteur en français.
 *
 * @param actorType - 'operator' | 'client' | 'system' | 'elio'
 */
export function resolveActorLabel(actorType: string): string {
  switch (actorType) {
    case 'operator':
      return 'par toi'
    case 'client':
      return 'par le client'
    case 'elio':
      return 'par Élio'
    case 'system':
      return 'automatique'
    default:
      return ''
  }
}
