import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getCalendarStatus, connectCalcom } from './calendar'

type Row = {
  provider: string
  connected: boolean
  label: string
  color: string
  metadata: Record<string, unknown>
}

function mockClientWith(rows: Row[]) {
  const select = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: rows }) }))
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({ select })),
  }
}

const googleRow = (label: string, connected: boolean): Row => ({
  provider: 'google',
  connected,
  label,
  color: '#06b6d4',
  metadata: { email: label },
})

describe('getCalendarStatus — état réel des comptes Google', () => {
  beforeEach(() => vi.clearAllMocks())

  async function statusFor(rows: Row[]) {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockClientWith(rows) as never)
    const { data } = await getCalendarStatus()
    return data!
  }

  it('marque needsReconnect quand Google a révoqué le compte', async () => {
    // Régression 2026-08-01 : l'écran affichait « Connecté » en vert pendant que
    // l'agenda affichait « Token expiré » — le badge était écrit en dur.
    const data = await statusFor([googleRow('culus.osteo@gmail.com', false)])

    expect(data.googleAccounts).toHaveLength(1)
    expect(data.googleAccounts[0]!.needsReconnect).toBe(true)
  })

  it('laisse needsReconnect à false pour un compte qui fonctionne', async () => {
    const data = await statusFor([googleRow('contact@monprojet-pro.com', true)])

    expect(data.googleAccounts[0]!.needsReconnect).toBe(false)
  })

  it('garde le compte révoqué VISIBLE avec son nom et sa couleur', async () => {
    // S'il disparaissait de la liste, la reconnexion serait introuvable.
    const data = await statusFor([googleRow('culus.osteo@gmail.com', false)])

    expect(data.googleAccounts[0]!.label).toBe('culus.osteo@gmail.com')
    expect(data.googleAccounts[0]!.color).toBe('#06b6d4')
  })

  it('distingue les deux comptes indépendamment', async () => {
    const data = await statusFor([
      googleRow('culus.osteo@gmail.com', false),
      googleRow('contact@monprojet-pro.com', true),
    ])

    expect(data.googleAccounts.map(a => a.needsReconnect)).toEqual([true, false])
  })

  it('masque en revanche un Cal.com ou un flux iCal non connecté', async () => {
    // Le traitement « rester visible » vaut pour Google uniquement : Cal.com et
    // iCal n'ont pas de jeton à renouveler, non-connecté y signifie absent.
    const data = await statusFor([
      { provider: 'calcom', connected: false, label: 'Cal.com', color: '#a855f7', metadata: { url: 'x' } },
      { provider: 'ical', connected: false, label: 'Vacances', color: '#ec4899', metadata: { url: 'y' } },
    ])

    expect(data.calcom).toBe(false)
    expect(data.icalFeeds).toHaveLength(0)
  })

  it('expose le lien rdv-offert stocke a cote de l\'URL principale', async () => {
    const data = await statusFor([
      {
        provider: 'calcom',
        connected: true,
        label: 'default',
        color: '#a855f7',
        metadata: { url: 'https://cal.com/mickael-culus-unpfqq/visio-client', rdvOffertUrl: 'https://cal.com/mickael-culus-unpfqq/rdv-offert' },
      },
    ])

    expect(data.calcomUrl).toBe('https://cal.com/mickael-culus-unpfqq/visio-client')
    expect(data.calcomRdvOffertUrl).toBe('https://cal.com/mickael-culus-unpfqq/rdv-offert')
  })
})

describe('connectCalcom — T-048 : ne jamais ecraser rdvOffertUrl en silence', () => {
  beforeEach(() => vi.clearAllMocks())

  function mockUpsertClient(existingMetadata: Record<string, unknown> | null) {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const maybeSingle = vi.fn().mockResolvedValue({ data: existingMetadata ? { metadata: existingMetadata } : null })
    const eqChain = { eq: vi.fn().mockReturnThis(), maybeSingle }
    const select = vi.fn(() => eqChain)
    return {
      client: {
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
        from: vi.fn(() => ({ select, upsert })),
      },
      upsert,
    }
  }

  it('reecrit rdvOffertUrl quand il est explicitement passe', async () => {
    const { client, upsert } = mockUpsertClient({ url: 'https://cal.com/old', rdvOffertUrl: 'https://cal.com/old-offert' })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    await connectCalcom('https://cal.com/mickael-culus-unpfqq/visio-client', 'https://cal.com/mickael-culus-unpfqq/rdv-offert')

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { url: 'https://cal.com/mickael-culus-unpfqq/visio-client', rdvOffertUrl: 'https://cal.com/mickael-culus-unpfqq/rdv-offert' },
      }),
      expect.anything()
    )
  })

  it('preserve rdvOffertUrl existant quand on ne modifie que l\'URL principale', async () => {
    // Regression visee : avant ce test, re-sauvegarder l'URL principale depuis
    // l'ecran effacait silencieusement le lien rdv-offert deja stocke.
    const { client, upsert } = mockUpsertClient({ url: 'https://cal.com/old', rdvOffertUrl: 'https://cal.com/mickael-culus-unpfqq/rdv-offert' })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    await connectCalcom('https://cal.com/mickael-culus-unpfqq/visio-client')

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { url: 'https://cal.com/mickael-culus-unpfqq/visio-client', rdvOffertUrl: 'https://cal.com/mickael-culus-unpfqq/rdv-offert' },
      }),
      expect.anything()
    )
  })

  it('ecrit rdvOffertUrl a null quand rien n\'existait avant et rien n\'est passe', async () => {
    const { client, upsert } = mockUpsertClient(null)
    vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)

    await connectCalcom('https://cal.com/mickael-culus-unpfqq/visio-client')

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { url: 'https://cal.com/mickael-culus-unpfqq/visio-client', rdvOffertUrl: null },
      }),
      expect.anything()
    )
  })
})
