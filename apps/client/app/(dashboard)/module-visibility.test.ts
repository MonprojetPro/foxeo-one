import { describe, it, expect } from 'vitest'
import type { ModuleManifest, ModuleTarget } from '@monprojetpro/types'
import { selectVisibleModules } from './module-visibility'

function manifest(
  id: string,
  targets: ModuleTarget[],
  position: number,
): ModuleManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    targets,
    navigation: { label: id, icon: 'Box', position },
  } as unknown as ModuleManifest
}

// Reflet du catalogue réel : famille « relation » = socle du lien avec MiKL,
// famille « cockpit » = ce qui pilote l'outil payé.
const RELATION = ['core-dashboard', 'chat', 'documents', 'support', 'visio', 'elio', 'suivi-outil']
const COCKPIT = ['facturation']

const ALL: ModuleManifest[] = [
  manifest('core-dashboard', ['client-one', 'client-lab'], 1),
  manifest('chat', ['client-one', 'client-lab'], 2),
  manifest('documents', ['client-one', 'client-lab'], 3),
  manifest('support', ['client-one', 'client-lab'], 4),
  manifest('visio', ['client-one', 'client-lab'], 5),
  manifest('elio', ['client-one'], 6),
  manifest('suivi-outil', ['client-one', 'client-lab'], 7),
  manifest('facturation', ['client-one'], 8),
  manifest('parcours', ['client-lab'], 9),
]

const ACTIVE = [...RELATION, ...COCKPIT, 'parcours']

describe('selectVisibleModules', () => {
  it('affiche tous les modules actifs quand rien n’est masqué (client actif)', () => {
    const ids = selectVisibleModules(ALL, 'client-one', ACTIVE).map((m) => m.id)

    expect(ids).toContain('facturation')
    expect(ids).toContain('chat')
    expect(ids).toContain('documents')
  })

  it('masque les modules cockpit pour un client résilié', () => {
    const ids = selectVisibleModules(ALL, 'client-one', ACTIVE, COCKPIT).map((m) => m.id)

    expect(ids).not.toContain('facturation')
  })

  it('garde TOUS les modules relation pour un client résilié — le lien avec MiKL reste ouvert', () => {
    const ids = selectVisibleModules(ALL, 'client-one', ACTIVE, COCKPIT).map((m) => m.id)

    for (const relationModule of RELATION) {
      expect(ids).toContain(relationModule)
    }
  })

  it('garde le chat et le support, qui sont le canal de retour du client', () => {
    const ids = selectVisibleModules(ALL, 'client-one', ACTIVE, COCKPIT).map((m) => m.id)

    expect(ids).toContain('chat')
    expect(ids).toContain('support')
  })

  it('laisse le parcours Lab consultable pour un client résilié (figé, pas retiré)', () => {
    const ids = selectVisibleModules(ALL, 'client-lab', ACTIVE, COCKPIT).map((m) => m.id)

    expect(ids).toContain('parcours')
  })

  it('ne masque rien qui ne soit pas dans hiddenModuleIds', () => {
    const ids = selectVisibleModules(ALL, 'client-one', ACTIVE, ['module-inexistant'])

    expect(ids).toHaveLength(
      selectVisibleModules(ALL, 'client-one', ACTIVE).length
    )
  })

  it('respecte l’ordre de navigation', () => {
    const positions = selectVisibleModules(ALL, 'client-one', ACTIVE).map(
      (m) => m.navigation.position
    )

    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})
