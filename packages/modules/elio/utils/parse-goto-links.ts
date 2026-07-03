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

/**
 * Mapping CLE de navigation → route réelle du dashboard client.
 *
 * ⚠️ Chaque clé DOIT pointer vers une page qui EXISTE côté client, sinon le bouton mène au
 * catch-all « module non déployé » ou à un 404. Les clés autorisées sont annoncées à Élio
 * dans ONE_NAVIGATION_MAP (seul le prompt One émet des jetons ; les clés communes — chat,
 * visio, documents, support, tableau-de-bord — restent valides en mode Lab).
 *
 * Nettoyage 2026-07-03 : retrait des destinations mortes (`elio` : la page a été remplacée
 * par la pop-up unique et le rendu goto est un simple <Link> — pas d'ouverture de pop-up ;
 * `crm`, `agenda`, `membres`, `sms`, `presences` : aucune page client n'existe) ; remap
 * `facturation` → Paramètres → Mes factures (le module Comptabilité ne cible plus le One).
 */
export const GOTO_ROUTES: Record<string, string> = {
  'tableau-de-bord': '/',
  chat: '/modules/chat',
  documents: '/modules/documents',
  visio: '/modules/visio',
  'suivi-outil': '/modules/suivi-outil',
  support: '/modules/support',
  parametres: '/settings',
  facturation: '/settings/billing', // « Mes factures » — abonnement MPP + historique des factures
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
