import 'server-only'

/**
 * Helper SERVEUR UNIQUE pour parler au guichet « admin-api » de MenuFacile.
 *
 * ⚠️ SÉCURITÉ — ne JAMAIS importer ce fichier dans un composant client.
 *   - `import 'server-only'` fait échouer le build si quelqu'un l'importe côté client.
 *   - Le secret est lu depuis `process.env.MENUFACILE_ADMIN_API_SECRET` (jamais
 *     préfixé NEXT_PUBLIC_ → jamais exposé au navigateur).
 *
 * Tout appel au guichet passe par ici : on centralise l'URL de base, le header
 * Authorization, et le décodage uniforme des réponses `{ data }` / `{ error }`.
 */

export class MenuFacileAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'MenuFacileAdminError'
  }
}

function getConfig(): { baseUrl: string; secret: string } {
  const baseUrl = process.env.MENUFACILE_ADMIN_API_URL
  const secret = process.env.MENUFACILE_ADMIN_API_SECRET

  if (!baseUrl) {
    throw new MenuFacileAdminError(
      'MENUFACILE_ADMIN_API_URL manquante dans la configuration du Hub.',
      503,
    )
  }
  if (!secret) {
    throw new MenuFacileAdminError(
      'MENUFACILE_ADMIN_API_SECRET manquante dans la configuration du Hub.',
      503,
    )
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), secret }
}

/**
 * Appelle un endpoint du guichet et renvoie le contenu du champ `data`
 * (ou `true` pour les réponses `{ ok: true }`).
 *
 * @param path  ex. '/metrics', '/reports?status=pending', '/official-recipes/123'
 * @param init  options fetch standard (method, body, ...). Le header
 *              Authorization + Content-Type JSON sont ajoutés automatiquement.
 */
export async function callMenuFacileAdmin<T = unknown>(
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

  // Le guichet répond toujours en JSON ; on tente de le lire même en cas d'erreur.
  let payload: unknown = null
  const text = await res.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ??
      `Erreur guichet MenuFacile (HTTP ${res.status})`
    throw new MenuFacileAdminError(message, res.status)
  }

  const body = payload as { data?: T; ok?: boolean } | null
  if (body && 'data' in body) {
    return body.data as T
  }
  // Réponses { ok: true } sans data → on renvoie le payload tel quel.
  return (body ?? (true as unknown)) as T
}
