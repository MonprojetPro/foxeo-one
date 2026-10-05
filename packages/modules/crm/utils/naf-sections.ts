/**
 * Libellés des 21 sections de la nomenclature NAF rév. 2 (INSEE).
 *
 * L'API Recherche d'entreprises renvoie le code d'activité (`68.31Z`) et la lettre
 * de section (`L`), mais JAMAIS de libellé lisible. On traduit donc la section ici
 * pour pré-remplir le champ « Secteur d'activité » avec quelque chose de lisible
 * plutôt qu'un code que personne ne déchiffre.
 */
export const NAF_SECTION_LABELS: Record<string, string> = {
  A: 'Agriculture, sylviculture et pêche',
  B: 'Industries extractives',
  C: 'Industrie manufacturière',
  D: 'Production et distribution d’électricité et de gaz',
  E: 'Production et distribution d’eau, assainissement, déchets',
  F: 'Construction',
  G: 'Commerce, réparation d’automobiles et de motocycles',
  H: 'Transports et entreposage',
  I: 'Hébergement et restauration',
  J: 'Information et communication',
  K: 'Activités financières et d’assurance',
  L: 'Activités immobilières',
  M: 'Activités spécialisées, scientifiques et techniques',
  N: 'Activités de services administratifs et de soutien',
  O: 'Administration publique',
  P: 'Enseignement',
  Q: 'Santé humaine et action sociale',
  R: 'Arts, spectacles et activités récréatives',
  S: 'Autres activités de services',
  T: 'Activités des ménages en tant qu’employeurs',
  U: 'Activités extra-territoriales',
}

/** Libellé de secteur à partir de la lettre de section NAF, ou undefined si inconnue. */
export function nafSectionLabel(section?: string | null): string | undefined {
  if (!section) return undefined
  return NAF_SECTION_LABELS[section.toUpperCase()]
}

/** Ne garde que les chiffres — un SIRET se saisit souvent avec des espaces. */
export function normalizeSiret(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Validation de la clé de Luhn du SIRET (14 chiffres).
 *
 * Évite d'appeler l'API pour une coquille de saisie. Exception documentée par
 * l'INSEE : La Poste (SIREN 356000000) ne respecte pas la clé de Luhn.
 */
export function isValidSiret(siret: string): boolean {
  if (!/^[0-9]{14}$/.test(siret)) return false
  if (siret.startsWith('356000000')) return true

  let sum = 0
  for (let i = 0; i < 14; i++) {
    const position = 14 - i
    let digit = Number(siret[i])
    // Les chiffres de rang pair (en partant de la droite) sont doublés.
    if (position % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}
