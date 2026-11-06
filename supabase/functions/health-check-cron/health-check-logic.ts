// health-check-logic.ts — Logique métier testable (Vitest compatible)
// Les fonctions pures sont isolées ici pour ne pas dépendre de Deno/Supabase.

export type ServiceStatus = 'ok' | 'degraded' | 'error'
export type GlobalStatus = 'ok' | 'degraded' | 'error'

export interface ServiceCheck {
  status: ServiceStatus
  latencyMs: number
  error?: string
}

export interface HealthCheckResult {
  checkedAt: string
  services: Record<string, ServiceCheck>
  globalStatus: GlobalStatus
}

// Seuils par service (ms)
export const THRESHOLDS: Record<string, { warn: number; error: number }> = {
  // Recalibré : un aller-retour REST depuis l'Edge Function mesure ~130–400 ms
  // (sauts réseau inclus). Les seuils 300/500 faisaient clignoter la DB en « degraded »
  // sans vraie dégradation. Une vraie lenteur (>1,5 s) reste détectée.
  supabase_db: { warn: 800, error: 1500 },
  supabase_storage: { warn: 1000, error: 2000 },
  supabase_auth: { warn: 500, error: 1000 },
  // Recalibré : l'endpoint de check Realtime (/realtime/v1/channels) répond
  // normalement en ~2 s. Les anciens seuils (500/1000) le faisaient passer en
  // « error » en permanence alors que le Realtime fonctionne. Une vraie panne
  // reste détectée via le timeout (5 s → error).
  supabase_realtime: { warn: 3000, error: 5000 },
  pennylane: { warn: 1500, error: 2000 },
  cal_com: { warn: 2000, error: 5000 },
  // Apps Vercel (Hub + client) : SSR + middleware + cold start possibles → seuils larges.
  vercel_hub: { warn: 3000, error: 8000 },
  vercel_client: { warn: 3000, error: 8000 },
  // Recalibré 2026-09-20 : l'API Resend (GET /domains) répond normalement en
  // ~1150 ms depuis l'Edge Function. Les anciens seuils (1500/3000) laissaient le
  // service vivre à 77 % de son seuil d'alerte — le moindre pic le faisait basculer
  // en « error », soit 17 fausses alertes en 30 jours (seul service concerné, mesuré
  // dans activity_logs). Une vraie panne reste détectée via le timeout (8 s → error).
  resend: { warn: 2500, error: 5000 },
}

// Durée minimale d'erreur CONTINUE avant d'alerter (2026-07-11 — anti-fantôme).
// Un service doit être en `error` depuis au moins 15 min (≈ 3 cycles de 5 min)
// pour déclencher une alerte cloche. Filtre les blips transitoires qui se
// soignent seuls. La surveillance externe (Better Stack) prend le relais pour
// l'urgence temps réel.
export const SUSTAINED_ERROR_MS = 15 * 60 * 1000

/** Détermine le statut d'un service en fonction de la latence et des seuils */
export function evaluateServiceStatus(
  service: string,
  latencyMs: number,
  failed: boolean
): ServiceStatus {
  if (failed) return 'error'
  const threshold = THRESHOLDS[service]
  if (!threshold) return latencyMs > 2000 ? 'degraded' : 'ok'
  if (latencyMs >= threshold.error) return 'error'
  if (latencyMs >= threshold.warn) return 'degraded'
  return 'ok'
}

/** Calcule le statut global depuis les statuts individuels */
export function determineGlobalStatus(
  services: Record<string, ServiceCheck>
): GlobalStatus {
  const statuses = Object.values(services).map((s) => s.status)
  if (statuses.some((s) => s === 'error')) return 'error'
  if (statuses.some((s) => s === 'degraded')) return 'degraded'
  return 'ok'
}

/** Construit le résultat complet health check */
export function buildHealthCheckResult(
  services: Record<string, ServiceCheck>,
  checkedAt: string = new Date().toISOString()
): HealthCheckResult {
  return {
    checkedAt,
    services,
    globalStatus: determineGlobalStatus(services),
  }
}

// ── Suivi d'incidents (auto-résolution — 2026-07-11) ──────────────────────────
//
// Le problème résolu : avant, une alerte partait dès qu'un service était `error`
// 2 cycles de suite, MAIS elle restait affichée dans la cloche même après le
// retour à la normale (« le monitoring est vert mais j'ai une alerte fantôme »).
//
// Nouveau modèle : on garde un état d'incident par service.
//  • `errorSince`      = début de la série d'erreurs en cours.
//  • `notificationId`  = id de l'alerte cloche ouverte (null tant que pas alerté).
// Règles :
//  1. On alerte UNE fois quand l'erreur dure ≥ SUSTAINED_ERROR_MS (panne durable).
//  2. Dès que le service repasse ok/degraded, l'alerte ouverte est SUPPRIMÉE
//     (auto-résolution) → la cloche ne montre que des pannes réellement en cours.

export interface Incident {
  /** ISO — début de la série d'erreurs continue en cours */
  errorSince: string
  /** id de la notification cloche ouverte, ou null si pas encore alerté */
  notificationId: string | null
}

export type IncidentMap = Record<string, Incident>

// ── Anti-spam des alertes recurrentes (2026-11-06) ────────────────────────────
//
// Le probleme vecu par MiKL : un service qui flanche par intermittence (ex.
// supabase_db, plusieurs pannes de 15-25 min par jour) auto-resout son incident
// a chaque retour a la normale (cf. ci-dessus), donc CHAQUE nouvelle panne repart
// de zero et declenche sa PROPRE alerte email — 5 a 7 mails en quelques jours
// pour le meme probleme sous-jacent jamais diagnostique entre deux mails.
//
// Le cooldown ci-dessous est INDEPENDANT du cycle de vie de l'incident (qui, lui,
// reste auto-resolu des le retour a la normale — on garde ce comportement pour
// la cloche du Hub, qui ne doit jamais montrer une panne terminee). Il ne fait
// que RETARDER le prochain EMAIL pour le meme service, pas la detection.

/** Duree minimale entre deux emails d'alerte pour le MEME service (3h). */
export const ALERT_COOLDOWN_MS = 3 * 60 * 60 * 1000

export interface AlertCooldown {
  /** ISO — date du dernier email d'alerte reellement envoye pour ce service */
  lastAlertedAt: string
  /** Nombre d'alertes (envoyees OU supprimees par le cooldown) depuis la 1ere */
  occurrenceCount: number
}

export type CooldownMap = Record<string, AlertCooldown>

export interface IncidentReconciliation {
  /** Services à alerter maintenant (panne durable, pas encore notifiée, hors cooldown) */
  toAlert: string[]
  /** Alertes ouvertes à supprimer (service revenu à la normale) */
  toResolve: { service: string; notificationId: string }[]
  /** État d'incidents à persister pour le prochain cycle */
  nextIncidents: IncidentMap
  /** État des cooldowns d'alerte à persister pour le prochain cycle */
  nextCooldowns: CooldownMap
}

/**
 * Compare l'état courant des services aux incidents connus et décide :
 * qui alerter (panne durable, hors cooldown), quelles alertes fermer (service
 * rétabli), et l'état d'incidents + de cooldowns à sauvegarder.
 *
 * Note : pour les services `toAlert`, le `notificationId` reste `null` dans
 * `nextIncidents` — l'appelant le renseigne après l'insertion réelle de la notif.
 */
export function reconcileIncidents(
  services: Record<string, ServiceCheck>,
  prevIncidents: IncidentMap = {},
  nowMs: number = Date.now(),
  prevCooldowns: CooldownMap = {}
): IncidentReconciliation {
  const toAlert: string[] = []
  const toResolve: { service: string; notificationId: string }[] = []
  const nextIncidents: IncidentMap = {}
  const nextCooldowns: CooldownMap = { ...prevCooldowns }

  for (const [service, check] of Object.entries(services)) {
    const prev = prevIncidents[service]

    if (check.status === 'error') {
      const errorSince = prev?.errorSince ?? new Date(nowMs).toISOString()
      const notificationId = prev?.notificationId ?? null
      const sustainedMs = nowMs - new Date(errorSince).getTime()

      // Alerte seulement si l'erreur dure ET qu'aucune alerte n'est déjà ouverte
      if (!notificationId && sustainedMs >= SUSTAINED_ERROR_MS) {
        const cooldown = prevCooldowns[service]
        const msSinceLastAlert = cooldown
          ? nowMs - new Date(cooldown.lastAlertedAt).getTime()
          : Infinity

        if (msSinceLastAlert >= ALERT_COOLDOWN_MS) {
          toAlert.push(service)
          nextCooldowns[service] = {
            lastAlertedAt: new Date(nowMs).toISOString(),
            occurrenceCount: (cooldown?.occurrenceCount ?? 0) + 1,
          }
        } else {
          // Panne reelle et durable, mais le meme service a deja alerte il y a
          // moins de ALERT_COOLDOWN_MS : on compte l'occurrence, pas d'email.
          nextCooldowns[service] = {
            lastAlertedAt: cooldown!.lastAlertedAt,
            occurrenceCount: cooldown!.occurrenceCount + 1,
          }
        }
      }
      nextIncidents[service] = { errorSince, notificationId }
    } else {
      // Service revenu ok/degraded : auto-résolution si une alerte était ouverte
      if (prev?.notificationId) {
        toResolve.push({ service, notificationId: prev.notificationId })
      }
      // Incident clos → on ne le persiste pas (absent de nextIncidents).
      // Le cooldown, lui, SURVIT a la resolution (deja copie dans nextCooldowns
      // par le spread initial) : c'est tout l'interet, il couvre les episodes
      // suivants de la meme panne intermittente.
    }
  }

  return { toAlert, toResolve, nextIncidents, nextCooldowns }
}
