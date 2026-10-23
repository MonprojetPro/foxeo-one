import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'cii',
  name: 'Crédit d\'Impôt Innovation',
  description: 'Reformulation des fonctions dev au format CII (Action+Innovation+Technologie+Bénéfice) et transfert vers devis/facture',
  version: '1.0.0',
  // Module interne operateur — le client n'a jamais a voir cet assistant.
  targets: ['hub'],
  navigation: {
    label: 'CII',
    icon: 'badge-percent',
    position: 65,
  },
  routes: [],
  requiredTables: ['cii_imports', 'cii_reformulation_lines'],
  dependencies: ['facturation'],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
