export const MODE_TOGGLE_COOKIE = 'mpp_active_view'

/**
 * Messages de teasing affichés quand un client clique sur un mode verrouillé.
 * Textes verbatim de la vision produit (saas-b2b-specific-requirements.md §Messages Teasing).
 */
export const MODE_LOCKED_MESSAGES = {
  // Client Lab (non gradué) qui clique sur Mode One.
  one: {
    title: '🚀 Bienvenue dans ton futur espace One !',
    body: 'Une fois ton parcours Lab terminé, tu accéderas ici à ton dashboard métier personnalisé avec Élio One, ton assistant qui connaît ton business. Continue ton parcours Lab pour débloquer cette partie !',
  },
  // Client One (sans Lab) qui clique sur Mode Lab.
  lab: {
    title: '🧪 Découvre le Lab MonprojetPro !',
    body: "Tu as un nouveau projet en tête ? Une idée à structurer ? Le Lab t'accompagne de l'idée au business avec Élio Lab, ton partenaire de création. Curieux ? Contacte MiKL pour explorer cette aventure.",
  },
} as const
