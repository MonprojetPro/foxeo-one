import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'chat',
  name: 'Chat',
  description: 'Messagerie temps réel MiKL-client',
  version: '1.0.0',
  targets: ['hub', 'client-lab', 'client-one'],
  navigation: {
    label: 'Chat MiKL',
    icon: 'message-circle',
    position: 20,
  },
  routes: [
    { path: '/modules/chat', component: 'ChatPage' },
    { path: '/modules/chat/:clientId', component: 'ChatConversation' },
  ],
  requiredTables: ['messages'],
  dependencies: [],
  documentation: { hasGuide: true, hasFaq: true, hasFlows: true },
}
