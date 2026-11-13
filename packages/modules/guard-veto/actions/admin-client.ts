import 'server-only'

/**
 * Point de passage UNIQUE vers le guichet `/api/hub/*` de GuardVeto.
 *
 * ⚠️ SÉCURITÉ — ne JAMAIS importer ce fichier dans un composant client.
 *   - `import 'server-only'` fait échouer le build si quelqu'un l'importe côté
 *     client, plutôt que de laisser fuiter le secret un jour de distraction.
 *   - Le secret est lu dans `process.env.GUARDVETO_ADMIN_API_SECRET`, jamais
 *     préfixé `NEXT_PUBLIC_` → il n'atteint jamais le navigateur.
 *
 * 🔑 UNE PANNE DOIT SE VOIR. Le guichet répond `{ data }` ou `{ error }` ; on
 * décode les deux ici, et une absence de configuration lève un 503 explicite
 * au lieu d'un écran vide. C'est la leçon payée sur la synchro Pennylane : une
 * lecture qui échoue en silence a menti pendant un mois.
 */

export class GuardVetoAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'GuardVetoAdminError'
  }
}

function getConfig(): { baseUrl: string; secret: string } {
  const baseUrl = process.env.GUARDVETO_ADMIN_API_URL
  const secret = process.env.GUARDVETO_ADMIN_API_SECRET

  if (!baseUrl) {
    throw new GuardVetoAdminError(
      'GUARDVETO_ADMIN_API_URL manquante dans la configuration du Hub.',
      503,
    )
  }
  if (!secret) {
    throw new GuardVetoAdminError(
      'GUARDVETO_ADMIN_API_SECRET manquante dans la configuration du Hub.',
      503,
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), secret }
}

/**
 * Appelle un endpoint du guichet et rend le contenu de `data`.
 *
 * @param path ex. '/cabinets', '/comptes?cabinetId=…', '/comptes/action'
 * @param init options fetch standard. Le Bearer et le Content-Type sont posés ici.
 */
export async function callGuardVetoAdmin<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { baseUrl, secret } = getConfig()

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  })

  // Le guichet répond toujours en JSON ; on le lit même en cas d'erreur, parce
  // que c'est là que se trouve la raison du refus (« déjà ouvert », « fiche
  // désactivée »…) qu'il faut montrer à MiKL plutôt qu'un code HTTP nu.
  let payload: unknown = null
  const texte = await res.text()
  if (texte) {
    try {
      payload = JSON.parse(texte)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      `Erreur guichet GuardVeto (HTTP ${res.status})`
    throw new GuardVetoAdminError(message, res.status)
  }

  const corps = payload as { data?: T } | null
  if (corps && 'data' in corps) {
    return corps.data as T
  }
  return (corps ?? (null as unknown)) as T
}
