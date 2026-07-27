import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLabParcoursContext } from './get-lab-parcours-context'

const agentsData = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }))
const cfgData = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))
const clientData = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))

vi.mock('@monprojetpro/supabase', () => ({
  isReadOnlyClientStatus: (status: string | null | undefined) =>
    status === 'subscription_cancelled' || status === 'handed_off',
  createServerSupabaseClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: clientData.value, error: null }),
            }),
          }),
        }
      }
      if (table === 'client_parcours_agents') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: agentsData.value, error: null }),
            }),
          }),
        }
      }
      // client_configs
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: cfgData.value, error: null }),
          }),
        }),
      }
    },
  })),
}))

describe('getLabParcoursContext', () => {
  beforeEach(() => {
    agentsData.value = []
    cfgData.value = null
    clientData.value = { status: 'active' }
  })

  it('retourne null sans clientId', async () => {
    expect(await getLabParcoursContext('')).toBeNull()
  })

  it('retourne null si le client n\'a pas de parcours', async () => {
    agentsData.value = []
    expect(await getLabParcoursContext('client-1')).toBeNull()
  })

  it('résume progression + étape en cours', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'Élio Go-to-Market', status: 'completed', is_enabled: true },
      { step_order: 2, step_label: 'Élio Cible', status: 'active', is_enabled: true },
    ]
    cfgData.value = { elio_lab_enabled: true }
    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).toContain('1/2')
    expect(ctx).toContain('Élio Cible')
    expect(ctx).toContain('Étape en cours')
    expect(ctx).not.toContain('EN PAUSE')
    // Défaut (pas de parcours_mode) → tracé
    expect(ctx).toContain('TRACÉ')
  })

  it('indique le mode LIBRE quand parcours_mode=libre', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'Élio Cible', status: 'active', is_enabled: true },
    ]
    cfgData.value = { elio_lab_enabled: true, parcours_mode: 'libre' }
    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).toContain('LIBRE')
  })

  it('signale les agents en pause quand elio_lab_enabled=false', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'Élio Cible', status: 'active', is_enabled: true },
    ]
    cfgData.value = { elio_lab_enabled: false }
    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).toContain('EN PAUSE')
  })

  it('signale au Concierge que l\'abonnement est terminé et interdit d\'inviter à reprendre', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'Élio Cible', status: 'active', is_enabled: true },
    ]
    cfgData.value = { elio_lab_enabled: true }
    clientData.value = { status: 'subscription_cancelled' }

    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).toContain("L'ABONNEMENT DU CLIENT EST TERMINÉ")
    expect(ctx).toContain('ARRÊTÉ DÉFINITIVEMENT')
    // L'étape n'est plus « en cours » : le parcours s'est arrêté là.
    expect(ctx).toContain("Étape où le parcours s'est arrêté")
    expect(ctx).not.toContain('Étape en cours')
  })

  it('ne signale rien de particulier pour un client actif', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'Élio Cible', status: 'active', is_enabled: true },
    ]
    cfgData.value = { elio_lab_enabled: true }
    clientData.value = { status: 'active' }

    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).not.toContain('ABONNEMENT')
    expect(ctx).toContain('Étape en cours')
  })

  it('exclut les agents désactivés (is_enabled=false) de la progression', async () => {
    agentsData.value = [
      { step_order: 1, step_label: 'A', status: 'completed', is_enabled: true },
      { step_order: 2, step_label: 'B', status: 'active', is_enabled: false },
    ]
    cfgData.value = { elio_lab_enabled: true }
    const ctx = await getLabParcoursContext('client-1')
    expect(ctx).toContain('1/1')
  })
})
