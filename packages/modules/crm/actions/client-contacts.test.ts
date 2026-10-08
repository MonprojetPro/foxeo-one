import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================
// T-039 — carnet de contacts : actions serveur.
//
// ⚠️ Ces tests MOCKENT Supabase : ils ne peuvent donc PAS prouver que la base
// accepte ce qu'on lui envoie (lecon « les tests mockes ne l'attrapent pas »,
// payee sur T-041b). La contrainte « un destinataire exige un e-mail » est donc
// verifiee DEUX fois : ici au niveau du schema Zod, et en base par un CHECK —
// c'est ce second niveau, lui, qui ne peut pas etre contourne.
// ============================================================

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getClientContacts } from './get-client-contacts'
import { createClientContact } from './create-client-contact'
import { updateClientContact } from './update-client-contact'
import { deleteClientContact } from './delete-client-contact'

const mockCreateServerSupabaseClient = vi.mocked(createServerSupabaseClient)

const CLIENT_ID = '444f3b89-5303-459f-a128-dfb0df99abf7'
const CONTACT_ID = '9b6e2c1d-0c2e-4d53-9d41-6f9c7a2b1e55'

const CONTACT_ROW = {
  id: CONTACT_ID,
  client_id: CLIENT_ID,
  operator_id: 'op-1',
  full_name: 'Marie Dupont',
  email: 'compta@habitat77.fr',
  note: 'Comptable — c est elle qui paie',
  receives_invoices: true,
  show_on_invoice: false,
  created_at: '2026-10-08T10:00:00Z',
  updated_at: '2026-10-08T10:00:00Z',
}

type MockOptions = {
  authenticated?: boolean
  operatorFound?: boolean
  rows?: Record<string, unknown>[]
  insertError?: { message: string } | null
  deleteError?: { message: string } | null
  contactForDelete?: { client_id: string } | null
  remainingRecipients?: number
  clientEmail?: string | null
}

function makeSupabase(options: MockOptions = {}) {
  const {
    authenticated = true,
    operatorFound = true,
    rows = [CONTACT_ROW],
    insertError = null,
    deleteError = null,
    contactForDelete = { client_id: CLIENT_ID },
    remainingRecipients = 1,
    clientEmail = 'login@habitat77.fr',
  } = options

  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: insertError ? null : rows[0], error: insertError })),
    })),
  }))

  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: rows[0], error: null })),
      })),
    })),
  }))

  const from = vi.fn((table: string) => {
    if (table === 'operators') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: operatorFound ? { id: 'op-1' } : null,
              error: operatorFound ? null : { message: 'not found' },
            })),
          })),
        })),
      }
    }

    if (table === 'clients') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { email: clientEmail }, error: null })),
          })),
        })),
      }
    }

    // client_contacts
    return {
      select: vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count === 'exact') {
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ count: remainingRecipients, error: null })),
            })),
          }
        }
        return {
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(async () => ({ data: rows, error: null })),
            })),
            maybeSingle: vi.fn(async () => ({ data: contactForDelete, error: null })),
          })),
        }
      }),
      insert,
      update,
      delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: deleteError })) })),
    }
  })

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authenticated ? { id: 'auth-op-1' } : null },
        error: authenticated ? null : new Error('Not authenticated'),
      })),
    },
    from,
    __spies: { insert, update },
  }
}

function use(mock: ReturnType<typeof makeSupabase>) {
  mockCreateServerSupabaseClient.mockResolvedValue(
    mock as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>
  )
}

describe('getClientContacts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuse un utilisateur non authentifie', async () => {
    use(makeSupabase({ authenticated: false }))
    const result = await getClientContacts(CLIENT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('exige un identifiant de client', async () => {
    use(makeSupabase())
    const result = await getClientContacts('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('transforme le snake_case de la base en camelCase', async () => {
    use(makeSupabase())
    const result = await getClientContacts(CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.[0]).toMatchObject({
      fullName: 'Marie Dupont',
      receivesInvoices: true,
      showOnInvoice: false,
    })
  })
})

describe('createClientContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuse un nom vide', async () => {
    use(makeSupabase())
    const result = await createClientContact({ clientId: CLIENT_ID, fullName: '   ' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('refuse une adresse e-mail mal formee', async () => {
    use(makeSupabase())
    const result = await createClientContact({
      clientId: CLIENT_ID,
      fullName: 'Marie Dupont',
      email: 'pas-une-adresse',
    })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  // 🔑 Le verrou central : un destinataire sans adresse serait coche a l'ecran et
  // muet a l'envoi — exactement le genre de panne qu'on ne voit jamais.
  it('refuse « recoit les factures » sans adresse e-mail', async () => {
    use(makeSupabase())
    const result = await createClientContact({
      clientId: CLIENT_ID,
      fullName: 'Marie Dupont',
      receivesInvoices: true,
    })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('adresse e-mail est requise')
  })

  it('accepte un contact SANS adresse tant qu il ne recoit pas les factures', async () => {
    const supabase = makeSupabase()
    use(supabase)
    const result = await createClientContact({ clientId: CLIENT_ID, fullName: 'Alex Rahli' })
    expect(result.error).toBeNull()
    expect(supabase.__spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Alex Rahli', email: null, receives_invoices: false })
    )
  })

  it('accepte les DEUX cases independamment — nom affiche, adresse d envoi', async () => {
    const supabase = makeSupabase()
    use(supabase)
    await createClientContact({
      clientId: CLIENT_ID,
      fullName: 'Alex Rahli',
      email: 'alex@habitat77.fr',
      receivesInvoices: false,
      showOnInvoice: true,
    })
    expect(supabase.__spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ receives_invoices: false, show_on_invoice: true })
    )
  })

  it('normalise une adresse vide en null plutot qu en chaine vide', async () => {
    const supabase = makeSupabase()
    use(supabase)
    await createClientContact({ clientId: CLIENT_ID, fullName: 'Paul', email: '' })
    expect(supabase.__spies.insert).toHaveBeenCalledWith(expect.objectContaining({ email: null }))
  })

  it('n ecrit JAMAIS clients.contact — un trigger en base en est le seul ecrivain', async () => {
    const supabase = makeSupabase()
    use(supabase)
    await createClientContact({ clientId: CLIENT_ID, fullName: 'Paul' })
    // Aucune ecriture sur la table clients : deux ecrivains sur la meme colonne
    // finiraient par afficher la valeur du plus recent, pas la bonne.
    const tablesTouchees = supabase.from.mock.calls.map((c) => c[0])
    expect(tablesTouchees).not.toContain('clients')
  })

  it('remonte un echec d insertion sans pretendre avoir reussi', async () => {
    use(makeSupabase({ insertError: { message: 'violates check constraint' } }))
    const result = await createClientContact({ clientId: CLIENT_ID, fullName: 'Paul' })
    expect(result.error?.code).toBe('CREATE_FAILED')
    expect(result.data).toBeNull()
  })
})

describe('updateClientContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuse « recoit les factures » sans adresse', async () => {
    use(makeSupabase())
    const result = await updateClientContact({
      contactId: CONTACT_ID,
      fullName: 'Marie Dupont',
      receivesInvoices: true,
      email: '',
    })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('enregistre les deux cases telles quelles', async () => {
    const supabase = makeSupabase()
    use(supabase)
    await updateClientContact({
      contactId: CONTACT_ID,
      fullName: 'Marie Dupont',
      email: 'compta@habitat77.fr',
      receivesInvoices: true,
      showOnInvoice: true,
    })
    expect(supabase.__spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ receives_invoices: true, show_on_invoice: true })
    )
  })
})

describe('deleteClientContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuse un identifiant vide', async () => {
    use(makeSupabase())
    const result = await deleteClientContact('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('remonte NOT_FOUND quand le contact n existe pas (ou n est pas a cet operateur)', async () => {
    use(makeSupabase({ contactForDelete: null }))
    const result = await deleteClientContact(CONTACT_ID)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  // La suppression N'EST PAS bloquee quand c'etait le dernier destinataire : une
  // comptable peut quitter l'entreprise, et c'est justement ce moment-la qu'on
  // doit pouvoir traiter. Mais la consequence est RENDUE, pour etre affichee.
  it('autorise la suppression du dernier destinataire et rend l adresse de repli', async () => {
    use(makeSupabase({ remainingRecipients: 0, clientEmail: 'login@habitat77.fr' }))
    const result = await deleteClientContact(CONTACT_ID)
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ remainingRecipients: 0, fallbackEmail: 'login@habitat77.fr' })
  })

  it('rend le nombre de destinataires restants quand il en reste', async () => {
    use(makeSupabase({ remainingRecipients: 2 }))
    const result = await deleteClientContact(CONTACT_ID)
    expect(result.data?.remainingRecipients).toBe(2)
  })

  it('remonte un echec de suppression', async () => {
    use(makeSupabase({ deleteError: { message: 'permission denied' } }))
    const result = await deleteClientContact(CONTACT_ID)
    expect(result.error?.code).toBe('DELETE_FAILED')
  })
})
