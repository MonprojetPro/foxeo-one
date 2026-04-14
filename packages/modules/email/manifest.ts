import type { ModuleManifest } from '@monprojetpro/types'

export const manifest: ModuleManifest = {
  id: 'email',
  name: 'Email',
  description: 'Gestion des emails clients avec transformation Élio',
  version: '1.0.0',
  targets: ['hub'],
  icon: 'Mail',
  route: '/modules/email',
  requiredEnv: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
}
