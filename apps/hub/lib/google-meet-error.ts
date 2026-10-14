/**
 * Lire le VRAI motif d'un échec Google Meet — fonctions pures (T-052).
 *
 * 🔑 POURQUOI CE FICHIER EXISTE : au premier envoi réel (2026-10-14), l'écran a
 * dit « Impossible de créer la salle Google Meet » — vrai, mais inexploitable.
 * Trois causes totalement différentes produisaient le même message, et le motif
 * réel partait dans un `console.error`, donc dans les journaux Vercel :
 *
 *   (a) un secret absent sur Vercel        -> il faut POSER le secret
 *   (b) un jeton révoqué (`invalid_grant`) -> il faut REGENERER le jeton
 *   (c) un scope manquant / API désactivée -> il faut AUTORISER côté Google Cloud
 *
 * Un message d'erreur de tiers sans son motif est inexploitable : c'est la
 * leçon déjà payée sur T-041a puis T-046. On la ferme ici aussi.
 *
 * ⚠️ On remonte le motif, JAMAIS une valeur de secret.
 */

/**
 * ⚠️ On reconnaît l'erreur de configuration par son NOM, pas par `instanceof`.
 *
 * `instanceof` compare des identités de classe : il devient faux dès que le
 * module est chargé deux fois (frontières de bundle serveur/client de Next,
 * modules mockés en test) — et pire, il LÈVE si la classe arrive `undefined`.
 * L'erreur serait alors avalée par le catch général et reclassée en « erreur
 * inattendue » : la sonde censée nous dire la cause masquerait justement la
 * seule cause qu'elle sait nommer. Un marqueur de forme est plus robuste.
 */
function isConfigError(err: unknown): err is { message: string; missing: string[] } {
  const e = err as { name?: string; missing?: unknown; message?: unknown } | null
  return (
    e?.name === 'GoogleMeetConfigError' &&
    Array.isArray(e.missing) &&
    typeof e.message === 'string'
  )
}

export type GoogleMeetFailureKind = 'config' | 'revoked' | 'permission' | 'unknown'

export interface GoogleMeetFailure {
  kind: GoogleMeetFailureKind
  /** Message destiné à MiKL : dit quoi faire, pas seulement ce qui a cassé. */
  message: string
  /** Motif brut tronqué, pour le journal et le diagnostic. */
  detail: string
}

const MAX_DETAIL = 300

function readGoogleError(err: unknown): { status: number | null; raw: string } {
  const e = err as {
    status?: number
    code?: number | string
    message?: string
    errors?: { reason?: string; message?: string }[]
    response?: { status?: number; data?: unknown }
  } | null

  const status =
    typeof e?.status === 'number'
      ? e.status
      : typeof e?.response?.status === 'number'
        ? e.response.status
        : typeof e?.code === 'number'
          ? e.code
          : null

  const parts: string[] = []
  if (e?.message) parts.push(e.message)
  for (const sub of e?.errors ?? []) {
    if (sub?.reason) parts.push(`reason=${sub.reason}`)
    if (sub?.message && sub.message !== e?.message) parts.push(sub.message)
  }
  if (parts.length === 0 && e?.response?.data) {
    try {
      parts.push(JSON.stringify(e.response.data))
    } catch {
      /* data non sérialisable — on s'en passe */
    }
  }

  return { status, raw: parts.join(' · ').slice(0, MAX_DETAIL) || 'aucun motif renvoyé par Google' }
}

export function describeGoogleMeetFailure(err: unknown): GoogleMeetFailure {
  // (a) Configuration — on sait exactement quoi poser, et où.
  if (isConfigError(err)) {
    return {
      kind: 'config',
      message: `La connexion Google n'est pas configurée sur le Hub : ${err.missing.join(', ')} ${
        err.missing.length > 1 ? 'sont absentes' : 'est absente'
      } des variables d'environnement Vercel. Aucun rendez-vous n'a été créé ni envoyé.`,
      detail: err.message,
    }
  }

  const { status, raw } = readGoogleError(err)
  const lower = raw.toLowerCase()

  // (b) Jeton révoqué ou expiré — il faut en régénérer un.
  if (lower.includes('invalid_grant') || lower.includes('token has been expired or revoked')) {
    return {
      kind: 'revoked',
      message:
        "La connexion Google a été révoquée ou a expiré : il faut régénérer le jeton Google Meet du Hub. Aucun rendez-vous n'a été créé ni envoyé.",
      detail: raw,
    }
  }

  // (c) Droits insuffisants côté Google Cloud — scope ou API.
  if (
    status === 403 ||
    lower.includes('permission_denied') ||
    lower.includes('service_disabled') ||
    lower.includes('insufficient') ||
    lower.includes('has not been used in project') ||
    lower.includes('accessnotconfigured')
  ) {
    return {
      kind: 'permission',
      message:
        "Google refuse la création de la salle : l'API Google Meet n'est pas activée, ou le jeton n'a pas l'autorisation « meetings.space.created ». Aucun rendez-vous n'a été créé ni envoyé.",
      detail: raw,
    }
  }

  // Inconnu — on remonte quand même le motif brut plutôt qu'un message creux.
  return {
    kind: 'unknown',
    message: `Google a refusé la création de la salle${status ? ` (HTTP ${status})` : ''} : ${raw}. Aucun rendez-vous n'a été créé ni envoyé.`,
    detail: raw,
  }
}
