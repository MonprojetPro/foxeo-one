/**
 * Registre des activités affichées dans le cockpit d'accueil ONE.
 *
 * ⚠️ PAS de directive 'use client' : module neutre (data + helpers), importé côté client
 * uniquement ici mais sans état React — calqué sur le registre CRM
 * (`@monprojetpro/modules-crm` activity-event-config) dont il reprend le langage visuel
 * (icônes lucide + classes `text-X bg-X/10`). On ne l'importe pas directement : les modules
 * ne s'importent pas entre eux et le registre CRM est massif (orienté Hub). Ici, on garde un
 * sous-ensemble FOCALISÉ sur ce que l'accueil One montre réellement (suivi de l'outil,
 * notifications), pensé pour s'ÉTENDRE facilement (cockpits métier site/app à venir).
 *
 * Source de données du cockpit (toutes réelles, déjà branchées Realtime) :
 *   • Suivi de l'outil  → useToolPosts (TanStack + Realtime, @monprojetpro/modules-suivi-outil)
 *   • Notifications     → useNotifications (TanStack + Realtime, @monprojetpro/modules-notifications)
 */

import {
  Megaphone,
  MessageSquare,
  Bell,
  CheckCircle2,
  Video,
  CreditCard,
  GraduationCap,
  AlertTriangle,
  FileText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

/** Catégorie d'une carte d'activité du cockpit. Extensible (ajouter une clé + sa config). */
export type OneActivityKind =
  | 'tool_post'
  | 'notif_message'
  | 'notif_validation'
  | 'notif_alert'
  | 'notif_system'
  | 'notif_graduation'
  | 'notif_payment'
  | 'notif_tool_update'
  | 'notif_tool_comment'
  | 'notif_elio'
  | 'notif_default'

export interface OneActivityVisual {
  Icon: LucideIcon
  /** Classes Tailwind (texte + fond translucide) — même langage que le registre CRM. */
  iconClass: string
}

const VISUALS: Record<OneActivityKind, OneActivityVisual> = {
  tool_post: { Icon: Megaphone, iconClass: 'text-emerald-400 bg-emerald-400/10' },
  notif_message: { Icon: MessageSquare, iconClass: 'text-indigo-400 bg-indigo-400/10' },
  notif_validation: { Icon: CheckCircle2, iconClass: 'text-green-400 bg-green-400/10' },
  notif_alert: { Icon: AlertTriangle, iconClass: 'text-orange-400 bg-orange-400/10' },
  notif_system: { Icon: Bell, iconClass: 'text-sky-400 bg-sky-400/10' },
  notif_graduation: { Icon: GraduationCap, iconClass: 'text-emerald-400 bg-emerald-400/10' },
  notif_payment: { Icon: CreditCard, iconClass: 'text-amber-400 bg-amber-400/10' },
  notif_tool_update: { Icon: Megaphone, iconClass: 'text-emerald-400 bg-emerald-400/10' },
  notif_tool_comment: { Icon: MessageSquare, iconClass: 'text-cyan-400 bg-cyan-400/10' },
  notif_elio: { Icon: Sparkles, iconClass: 'text-violet-400 bg-violet-400/10' },
  notif_default: { Icon: FileText, iconClass: 'text-zinc-400 bg-zinc-400/10' },
}

/** Map d'un `type` de notification (DB) vers une catégorie visuelle du cockpit. */
const NOTIF_TYPE_TO_KIND: Record<string, OneActivityKind> = {
  message: 'notif_message',
  validation: 'notif_validation',
  alert: 'notif_alert',
  inactivity_alert: 'notif_alert',
  system: 'notif_system',
  graduation: 'notif_graduation',
  payment: 'notif_payment',
  tool_update: 'notif_tool_update',
  tool_comment: 'notif_tool_comment',
  elio_escalation: 'notif_elio',
  csv_import_complete: 'notif_system',
  export_ready: 'notif_system',
}

/** Visuel d'un post de Suivi de l'outil. */
export function toolPostVisual(): OneActivityVisual {
  return VISUALS.tool_post
}

/** Visuel d'une notification selon son `type`. Fallback neutre si type inconnu. */
export function notificationVisual(notifType: string): OneActivityVisual {
  const kind = NOTIF_TYPE_TO_KIND[notifType] ?? 'notif_default'
  return VISUALS[kind]
}

// L'icône Video reste référencée pour de futures cartes cockpit (visio) — évite un
// import mort tout en documentant l'intention d'extension.
export const FUTURE_COCKPIT_ICONS = { Video } as const
