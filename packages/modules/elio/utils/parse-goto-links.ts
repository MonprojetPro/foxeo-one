/**
 * Deep-linking Élio (Élio One v2).
 *
 * Élio peut suggérer un onglet en clair dans sa phrase ET ajouter un jeton cliquable au
 * format `[[goto:CLE|Libellé]]` (cf. ONE_NAVIGATION_MAP). Cette fonction pure :
 *   1. extrait les jetons valides (CLE connue) → boutons cliquables,
 *   2. retire TOUS les jetons (même CLE inconnue) du texte affiché pour ne jamais montrer
 *      la syntaxe brute au client.
 *
 * Volontairement sans dépendance React : testable isolément, réutilisable côté UI.
 */

/** Mapping CLE de navigation → route réelle du dashboard client. */
export const GOTO_ROUTES: Record<string, string> = {
  'tableau-de-bord': '/',
  chat: '/modules/chat',
  visio: '/modules/visio',
  elio: '/modules/elio',
  documents: '/modules/documents',
  facturation: '/modules/facturation',
  crm: '/modules/crm',
  support: '/modules/support',
  agenda: '/modules/agenda',
  membres: '/modules/membres',
  sms: '/modules/sms',
  presences: '/modules/presences',
}

export interface GotoLink {
  /** CLE de navigation (ex: 'documents'). */
  key: string
  /** Libellé affiché sur le bouton. */
  label: string
  /** Route de destination. */
  href: string
}

// [[goto:CLE|Libellé]] — CLE en minuscules/tirets, libellé = tout sauf « ] ».
const GOTO_TOKEN = /\[\[goto:([a-z-]+)\|([^\]]+)\]\]/g

export function parseGotoLinks(content: string): { text: string; links: GotoLink[] } {
  if (!content || !content.includes('[[goto:')) {
    return { text: content, links: [] }
  }

  const links: GotoLink[] = []
  const seen = new Set<string>()

  let match: RegExpExecArray | null
  GOTO_TOKEN.lastIndex = 0
  while ((match = GOTO_TOKEN.exec(content)) !== null) {
    const key = match[1]?.trim() ?? ''
    const label = match[2]?.trim() ?? ''
    const href = GOTO_ROUTES[key]
    // CLE connue + non dupliquée → bouton. CLE inconnue → ignorée (jeton retiré du texte).
    if (href && label && !seen.has(key)) {
      seen.add(key)
      links.push({ key, label, href })
    }
  }

  // Retirer tous les jetons du texte (connus ET inconnus) puis nettoyer les espaces résiduels.
  const text = content
    .replace(GOTO_TOKEN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { text, links }
}
