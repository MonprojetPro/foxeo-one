/**
 * Circuits types — parcours préinstallés (MVP défini en code).
 *
 * Chaque circuit liste ses agents par NOM exact (`elio_lab_agents.name`) et non par id :
 * les ids diffèrent selon l'environnement, on les résout au moment de l'application
 * (cf. `applyParcoursTemplate`). Un agent absent du catalogue est simplement ignoré.
 *
 * Ces circuits sont des RACCOURCIS : ils pré-remplissent `client_parcours_agents`.
 * La composition manuelle (Lancer le Lab / Ajouter une étape / réordonner) reste intacte.
 */

export interface ParcoursTemplate {
  /** Identifiant stable du circuit (utilisé par l'action). */
  key: string
  /** Nom affiché. */
  label: string
  /** Profil d'entrepreneur visé (sous-titre court). */
  targetProfile: string
  /** Description courte du circuit. */
  description: string
  /** Agents dans l'ordre, par nom exact (`elio_lab_agents.name`). */
  agentNames: string[]
}

export const PARCOURS_TEMPLATES: ParcoursTemplate[] = [
  {
    key: 'fondation-complete',
    label: 'Fondation complète',
    targetProfile: 'Création complète, de A à Z',
    description: "Le parcours intégral, de la vision jusqu'à la feuille de route. Pour poser toutes les fondations d'un projet.",
    agentNames: [
      'Élio Vision',
      'Élio Marché',
      'Élio Cible',
      'Élio Positionnement',
      'Élio Offre',
      'Élio Business',
      'Élio Identité',
      'Élio Acquisition & Contenu',
      'Élio Legit',
      'Élio Récap',
      'Élio Feuille de route',
    ],
  },
  {
    key: 'prestataire-service',
    label: 'Prestataire de service',
    targetProfile: 'Freelance, consultant, coach',
    description: 'Cible, offre, viabilité et acquisition — le cœur de ce dont a besoin un prestataire pour démarrer.',
    agentNames: [
      'Élio Vision',
      'Élio Cible',
      'Élio Offre',
      'Élio Business',
      'Élio Positionnement',
      'Élio Acquisition & Contenu',
      'Élio Legit',
      'Élio Feuille de route',
    ],
  },
  {
    key: 'produit-physique',
    label: 'Produit physique / artisan',
    targetProfile: 'E-commerce, artisan, créateur de produit',
    description: 'Marché, offre, marge, identité et vente — pour un créateur qui fabrique et vend un produit.',
    agentNames: [
      'Élio Vision',
      'Élio Cible',
      'Élio Marché',
      'Élio Offre',
      'Élio Business',
      'Élio Identité',
      'Élio Acquisition & Contenu',
      'Élio Legit',
      'Élio Feuille de route',
    ],
  },
  {
    key: 'validation-express',
    label: 'Validation express',
    targetProfile: 'Tester vite une idée',
    description: "L'essentiel pour vérifier rapidement si une idée tient debout, sans détour.",
    agentNames: [
      'Élio Vision',
      'Élio Cible',
      'Élio Offre',
      'Élio Business',
      'Élio Feuille de route',
    ],
  },
  {
    key: 'relance-structuration',
    label: 'Relance / structuration',
    targetProfile: 'Activité déjà lancée à cadrer',
    description: 'Pour une activité existante qui veut se repositionner, clarifier son modèle et relancer son acquisition.',
    agentNames: [
      'Élio Marché',
      'Élio Positionnement',
      'Élio Offre',
      'Élio Business',
      'Élio Acquisition & Contenu',
      'Élio Feuille de route',
    ],
  },
]

export function getParcoursTemplate(key: string): ParcoursTemplate | undefined {
  return PARCOURS_TEMPLATES.find((t) => t.key === key)
}
