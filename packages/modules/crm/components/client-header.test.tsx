import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientHeader } from './client-header'
import type { Client } from '../types/crm.types'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/modules/crm/clients/client-1',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

describe('ClientHeader', () => {
  const mockClient: Client = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jean Dupont',
    company: 'Acme Corp',
    email: 'jean@acme.com',
    clientType: 'complet',
    status: 'active',
    sector: 'tech',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  }

  // T-073a — avant ce correctif, le bloc entier (y compris le bouton de statut compte)
  // disparaissait silencieusement quand un client n'avait ni Lab ni One actif, au lieu
  // de dire explicitement qu'il n'y a pas d'espace (constat de MiKL le 05-11 sur un
  // client "Complet" tout juste créé, sans aucun accès).
  it('aucun Lab ni One actif : pastille explicite « Pas d\'espace client »', () => {
    render(<ClientHeader client={{ ...mockClient, config: undefined }} />)

    expect(screen.getByText('Pas d\'espace client')).toBeInTheDocument()
  })

  // T-073d — le bouton ne doit plus jamais pouvoir declencher un envoi quand aucun
  // acces (Lab/One) n'est actif : il n'y a rien a renvoyer, et il ne doit pas en
  // inventer un a la place de MiKL (demande de MiKL le 05-11).
  it('aucun Lab ni One actif : le bouton de renvoi est desactive', () => {
    render(<ClientHeader client={{ ...mockClient, config: undefined }} />)

    expect(screen.getByTestId('resend-credentials-button')).toBeDisabled()
  })

  // T-073c — subscription_tier vaut 'ponctuel' PAR DEFAUT en base des la creation (colonne
  // NOT NULL DEFAULT), meme sans aucun acces reel : l'afficher annoncerait un statut qui
  // n'existe pas encore (MiKL, 05-11 : « ça ne sert à rien de l'afficher si aucun statut
  // n'est réel »). Masqué tant qu'aucun Lab/One n'est actif, affiché dès qu'un accès existe.
  it('aucun acces reel : le badge de palier d\'abonnement est masque, meme si subscriptionTier est renseigne', () => {
    render(
      <ClientHeader
        client={{ ...mockClient, config: { subscriptionTier: 'ponctuel' } as never }}
      />
    )
    expect(screen.queryByText('Ponctuel')).not.toBeInTheDocument()
  })

  it('un acces reel existe (One ouvert) : le badge de palier d\'abonnement s\'affiche', () => {
    render(
      <ClientHeader
        client={{ ...mockClient, config: { subscriptionTier: 'one_plus', oneModeAvailable: true } as never }}
      />
    )
    expect(screen.getByText('One+')).toBeInTheDocument()
  })

  it('should render client name as h1', () => {
    render(<ClientHeader client={mockClient} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Jean Dupont')
  })

  it('should render company name', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('should render client type badge', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText(/complet/i)).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText(/actif/i)).toBeInTheDocument()
  })

  it('should render creation date', () => {
    render(<ClientHeader client={mockClient} />)

    // Check for date presence (format might vary)
    expect(screen.getByText(/client depuis/i)).toBeInTheDocument()
  })

  it('should render edit button when onEdit prop is provided', () => {
    const mockOnEdit = vi.fn()
    render(<ClientHeader client={mockClient} onEdit={mockOnEdit} />)

    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
  })

  it('should NOT render edit button when onEdit prop is not provided', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
  })

  it('client actif avec Lab + agents actifs : pastille violette « Lab · agents actifs »', () => {
    render(
      <ClientHeader
        client={{ ...mockClient, config: { labModeAvailable: true, elioLabEnabled: true } as never }}
      />
    )
    expect(screen.getByText('Lab · agents actifs')).toBeInTheDocument()
  })

  it('client résilié (subscription_cancelled) : pastille Lab devient « Lab · figé » (ambre), jamais « agents actifs »', () => {
    render(
      <ClientHeader
        client={{
          ...mockClient,
          status: 'subscription_cancelled',
          config: { labModeAvailable: true, elioLabEnabled: true } as never,
        }}
      />
    )
    expect(screen.getByText('Lab · figé')).toBeInTheDocument()
    expect(screen.queryByText('Lab · agents actifs')).not.toBeInTheDocument()
  })

  it('client résilié avec accès One ouvert : pastille « One · figé » (ambre), jamais « One » vert', () => {
    render(
      <ClientHeader
        client={{
          ...mockClient,
          status: 'subscription_cancelled',
          config: { oneModeAvailable: true } as never,
        }}
      />
    )
    expect(screen.getByText('One · figé')).toBeInTheDocument()
    expect(screen.queryByText('One', { exact: true })).not.toBeInTheDocument()
  })

  it('client transféré (handed_off) : même comportement figé qu\'une résiliation', () => {
    render(
      <ClientHeader
        client={{
          ...mockClient,
          status: 'handed_off',
          config: { labModeAvailable: true, elioLabEnabled: true } as never,
        }}
      />
    )
    expect(screen.getByText('Lab · figé')).toBeInTheDocument()
  })

  // ── T-067e/T-073a — statut compte/activation dans le header ─────────────────
  // Le libellé reflète ce qui s'est réellement passé (pas juste « un email est parti ») :
  // first_login_at est la preuve que le client a utilisé son lien, pas welcomeEmailSentAt.

  it('aucun compte créé : pastille « Aucune création »', () => {
    render(
      <ClientHeader
        client={{ ...mockClient, config: { labModeAvailable: true } as never, authUserId: null, welcomeEmailSentAt: null, firstLoginAt: null }}
      />
    )
    expect(screen.getByText('Aucune création')).toBeInTheDocument()
  })

  it('compte créé, email envoyé mais jamais activé : pastille « Renvoyer le lien »', () => {
    render(
      <ClientHeader
        client={{
          ...mockClient,
          config: { labModeAvailable: true } as never,
          authUserId: 'auth-1',
          welcomeEmailSentAt: '2026-11-03T10:00:00Z',
          firstLoginAt: null,
        }}
      />
    )
    expect(screen.getByText('Renvoyer le lien')).toBeInTheDocument()
  })

  it('client déjà connecté au moins une fois : pastille « Espace actif »', () => {
    render(
      <ClientHeader
        client={{
          ...mockClient,
          config: { labModeAvailable: true } as never,
          authUserId: 'auth-1',
          welcomeEmailSentAt: '2026-11-03T10:00:00Z',
          firstLoginAt: '2026-11-04T08:00:00Z',
        }}
      />
    )
    expect(screen.getByText('Espace actif')).toBeInTheDocument()
  })
})
