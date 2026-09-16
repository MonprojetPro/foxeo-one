/**
 * Décide si un webhook non signé peut être traité.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE — incident du 2026-09-16.
 *
 * Les deux routes de webhook du Hub portaient chacune cette ligne :
 *
 *     if (!secret) return true // Dev : accepte tout si pas de secret configuré
 *
 * Un confort de développement parfaitement raisonnable en local, et une porte
 * ouverte en production : sondées sur la prod, les deux routes ont accepté une
 * requête NON SIGNÉE (`contact-form` → 400 sur la validation du corps,
 * `cal-com` → 200). Le secret n'avait jamais été posé dans Vercel, et rien ne
 * le signalait — l'absence de secret ne produisait aucune erreur, juste un
 * endpoint public écrivant en base avec la clé de service.
 *
 * La leçon n'est pas « il fallait poser le secret ». C'est que **le code
 * traitait une configuration manquante comme une autorisation**. Un secret
 * absent est une panne de configuration, jamais un laissez-passer.
 */

export type WebhookAuthDecision =
  /** Secret configuré : l'appelant doit vérifier la signature. */
  | { action: 'verify'; secret: string }
  /** Pas de secret, hors production : on laisse passer (dev, tests). */
  | { action: 'allow' }
  /** Pas de secret, en production : on refuse, c'est une panne de config. */
  | { action: 'misconfigured'; status: 500; message: string }

/**
 * @param secret      valeur de la variable d'environnement (peut être vide/absente)
 * @param nodeEnv     `process.env.NODE_ENV` — 'production' sur Vercel, y compris en preview
 * @param secretName  nom de la variable, pour que le message de journal soit actionnable
 */
export function decideWebhookAuth(
  secret: string | undefined,
  nodeEnv: string | undefined,
  secretName: string,
): WebhookAuthDecision {
  // Une chaîne vide est traitée comme absente : une variable déclarée mais non
  // renseignée dans Vercel est le cas le plus courant, et le plus trompeur —
  // elle « existe » dans le tableau de bord sans protéger quoi que ce soit.
  if (secret) {
    return { action: 'verify', secret }
  }

  if (nodeEnv === 'production') {
    return {
      action: 'misconfigured',
      status: 500,
      message: `${secretName} is not configured — refusing to process an unsigned webhook`,
    }
  }

  return { action: 'allow' }
}
