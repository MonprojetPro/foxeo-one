import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'visio',
  name: 'Visioconférence',
  description: 'Salle de visio OpenVidu — meetings en temps réel entre MiKL et clients',
  version: '1.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: {
    label: 'Visio',
    icon: 'video',
    position: 50,
  },
  routes: [
    { path: '/modules/visio', component: 'VisioPage' },
    { path: '/modules/visio/:meetingId', component: 'MeetingRoomPage' },
    { path: '/modules/visio/:meetingId/recordings', component: 'RecordingsPage' },
    { path: '/modules/visio/requests', component: 'MeetingRequestsPage' },
    { path: '/modules/visio/request', component: 'MeetingRequestPage' },
    { path: '/modules/visio/:meetingId/lobby', component: 'MeetingLobbyPage' },
  ],
  requiredTables: ['meetings', 'meeting_recordings', 'meeting_requests'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
