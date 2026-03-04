/**
 * Story 8.9b — Task 2
 * Templates de génération de documents pour Élio One+.
 * Chaque template contient un prompt LLM avec des placeholders {variable}.
 */

export type DocumentTemplateKey = 'attestation_presence' | 'attestation_paiement' | 'recap_mensuel' | 'export_data'

export interface DocumentTemplate {
  name: string
  prompt: string
  requiredFields: string[]
}

export const DOCUMENT_TEMPLATES: Record<DocumentTemplateKey, DocumentTemplate> = {
  attestation_presence: {
    name: 'Attestation de présence',
    requiredFields: ['beneficiary', 'period'],
    prompt: `
Génère une attestation de présence formelle pour :
- Bénéficiaire : {beneficiary}
- Période : {period}
- Événements/cours suivis : {events}

Format attendu :
---
ATTESTATION DE PRÉSENCE

Je soussigné(e) [Nom organisation], certifie que {beneficiary} a assisté aux événements suivants :
[Liste des événements avec dates]

Fait à [Ville], le [Date]

[Signature]
---
`,
  },
  attestation_paiement: {
    name: 'Attestation de paiement',
    requiredFields: ['beneficiary', 'amount'],
    prompt: `
Génère une attestation de paiement formelle pour :
- Bénéficiaire : {beneficiary}
- Montant : {amount}
- Période : {period}
- Motif : {reason}

Format attendu :
---
ATTESTATION DE PAIEMENT

Je soussigné(e) [Nom organisation], certifie avoir reçu de {beneficiary} la somme de {amount} au titre de {reason}.

Fait à [Ville], le [Date]

[Signature]
---
`,
  },
  recap_mensuel: {
    name: 'Récapitulatif mensuel',
    requiredFields: ['period'],
    prompt: `
Génère un récapitulatif mensuel structuré pour :
- Mois : {period}
- Données : {data}

Sections :
1. Résumé du mois
2. Statistiques clés
3. Événements importants
4. Points d'attention

Format : Markdown structuré
`,
  },
  export_data: {
    name: 'Export de données',
    requiredFields: ['type'],
    prompt: `
Génère un export de données au format tableau :
- Type : {type}
- Période : {period}
- Données : {data}

Format : CSV ou Markdown table
`,
  },
}

/**
 * Remplace les placeholders {variable} dans un template avec les données fournies.
 */
export function buildDocumentPrompt(
  templateKey: DocumentTemplateKey,
  data: Record<string, string | undefined>
): string {
  const template = DOCUMENT_TEMPLATES[templateKey]
  let prompt = template.prompt
  for (const [key, value] of Object.entries(data)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value ?? '')
  }
  return prompt
}
