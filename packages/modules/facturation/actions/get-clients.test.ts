import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-036 — verrou sur le filtre retire le 2026-10-06.
//
// getClientsWithPennylane filtrait `.not('pennylane_customer_id', 'is', null)`,
// ce qui rendait INVISIBLE dans les formulaires de facturation tout client
// jamais facture — alors que toutes les actions d emission creent le compte
// Pennylane a la volee. Constate sur le premier client reel (CSE HABITAT 77) :
// impossible de lui facturer quoi que ce soit depuis le Hub.
//
// Ce test echoue si quelqu un remet le filtre.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getClientsWithPennylane } from './get-clients'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

type ClientRow = {
  id: string
  name: string
  company: string | null
  email: string
  pennylane_customer_id: string | null
  lab_paid: boolean | null
  lab_paid_at: string | null
}

const ROWS: ClientRow[] = [
  {
    id: '444f3b89-5303-459f-a128-dfb0df99abf7',
    name: 'CSE HABITAT 77',
    company: 'CSE HABITAT 77',
    email: 'alex.rahli@habitat77.fr',
    // Jamais facture : c est precisement le cas que le filtre excluait
    pennylane_customer_id: null,
    lab_paid: false,
    lab_paid_at: null,
  },
  {
    id: 'client-2',
    name: 'Client deja facture',
    company: null,
    email: 'deja@example.com',
    pennylane_customer_id: '275890907',
    lab_paid: true,
    lab_paid_at: '2026-08-01T00:00:00Z',
  },
]

function makeSupabaseMock(options: { isOperator?: boolean; rows?: ClientRow[] } = {}) {
  const { isOperator = true, rows = ROWS } = options

  const order = vi.fn().mockResolvedValue({ data: rows, error: null })
  const notSpy = vi.fn().mockReturnValue({ order })
  const eq = vi.fn().mockReturnValue({ order, not: notSpy })
  const select = vi.fn().mockReturnValue({ eq })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isOperator }),
    from: vi.fn(() => ({ select })),
    __spies: { select, eq, not: notSpy, order },
  }
}

function useSupabase(mock: ReturnType<typeof makeSupabaseMock>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

describe('getClientsWithPennylane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un utilisateur non operateur', async () => {
    useSupabase(makeSupabaseMock({ isOperator: false }))

    const result = await getClientsWithPennylane()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it("ne filtre JAMAIS sur pennylane_customer_id — le compte est cree a la volee", async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)

    const result = await getClientsWithPennylane()

    expect(result.error).toBeNull()
    // Le verrou : aucun .not() ne doit etre pose sur la requete
    expect(supabase.__spies.not).not.toHaveBeenCalled()
  })

  it('retourne les clients sans compte Pennylane, avec pennylaneCustomerId a null', async () => {
    useSupabase(makeSupabaseMock())

    const result = await getClientsWithPennylane()

    expect(result.data).toHaveLength(2)
    const jamaisFacture = result.data?.find((c) => c.name === 'CSE HABITAT 77')
    expect(jamaisFacture).toBeDefined()
    expect(jamaisFacture?.pennylaneCustomerId).toBeNull()
  })

  it('ne retient que les clients actifs', async () => {
    const supabase = makeSupabaseMock()
    useSupabase(supabase)

    await getClientsWithPennylane()

    expect(supabase.__spies.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('remonte une erreur DB_ERROR si la requete echoue', async () => {
    const supabase = makeSupabaseMock()
    supabase.__spies.order.mockResolvedValue({ data: null, error: { message: 'boom' } })
    useSupabase(supabase)

    const result = await getClientsWithPennylane()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
