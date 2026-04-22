import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'visio',
  name: 'Visioconférence',
  description: 'Visioconférence Google Meet — meetings MiKL ↔ clients avec lien direct',
  version: '2.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: {
    label: 'Visio',
    icon: 'video',
    position: 50,
  },
  routes: [
    { path: '/modules/visio', component: 'VisioPage' },
    { path: '/modules/visio/:meetingId/recordings', component: 'RecordingsPage' },
  ],
  requiredTables: ['meetings', 'meeting_recordings'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
