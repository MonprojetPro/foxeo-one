import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'elio',
  name: 'Élio — Assistant IA',
  description: 'Assistant IA personnel pour le parcours Lab et le dashboard One',
  version: '1.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: {
    label: 'Élio',
    icon: 'bot',
    position: 99,
  },
  routes: [],
  requiredTables: ['communication_profiles'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
