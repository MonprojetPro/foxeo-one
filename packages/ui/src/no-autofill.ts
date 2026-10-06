/**
 * Demande aux gestionnaires de mots de passe de ne PAS s'inviter dans un formulaire.
 *
 * À poser sur les formulaires **métier** (créer un client, saisir un devis…), jamais
 * sur la page de connexion : là, l'auto-remplissage rend un vrai service à MiKL
 * comme aux clients, et il doit continuer de fonctionner.
 *
 * ⚠️ CE QUE CES ATTRIBUTS FONT RÉELLEMENT, ET CE QU'ILS NE FONT PAS.
 * Ce sont des *demandes*, pas des interdictions : chaque extension décide d'obéir.
 * - `data-1p-ignore`     → 1Password, documenté
 * - `data-lpignore`      → LastPass, documenté
 * - `data-bwignore`      → Bitwarden, documenté
 * - `data-form-type`     → Dashlane, documenté
 * - `autoComplete="off"` → l'auto-remplissage natif du navigateur
 * - **NordPass : AUCUN attribut développeur n'existe** (vérifié dans leur
 *   documentation le 2026-10-06). Ses seuls leviers sont côté utilisateur, dans
 *   l'extension : clic droit sur le champ → « Gérer le remplissage » → « Ne pas
 *   remplir ce champ », ou les options d'auto-remplissage par site.
 *
 * Pourquoi ça compte (incident T-035d, 2026-10-06) : un gestionnaire qui injecte
 * son bouton dans un champ modifie le DOM sous les pieds de React, qui ne reconnaît
 * plus sa propre page (erreur #418) puis plante. Une pop-up dont le React est mort
 * cesse de répondre — elle ne défile plus, elle ne se ferme plus.
 */
export const noAutofillProps = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
} as const

/** Même demande, au niveau du `<form>` : certaines extensions ne lisent que lui. */
export const noAutofillFormProps = {
  autoComplete: 'off',
  'data-form-type': 'other',
} as const
