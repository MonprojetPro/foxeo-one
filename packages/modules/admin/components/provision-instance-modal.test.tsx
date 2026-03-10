import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProvisionInstanceModal } from './provision-instance-modal'

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@foxeo/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

vi.mock('../actions/provision-instance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../actions/provision-instance')>()
  return {
    ...actual,
    provisionOneInstanceFromHub: vi.fn(),
  }
})

vi.mock('@foxeo/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  })),
}))

import { provisionOneInstanceFromHub } from '../actions/provision-instance'
import { showError, showSuccess } from '@foxeo/ui'

const defaultProps = {
  clientId: '11111111-1111-1111-1111-111111111111',
  companyName: 'Acme Corp',
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

describe('ProvisionInstanceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with pre-filled slug derived from company name', () => {
    render(<ProvisionInstanceModal {...defaultProps} />)
    const slugInput = screen.getByLabelText(/Sous-domaine/i) as HTMLInputElement
    expect(slugInput.value).toBe('acme-corp')
  })

  it('shows estimated cost', () => {
    render(<ProvisionInstanceModal {...defaultProps} />)
    expect(screen.getByText(/5–7€/)).toBeTruthy()
  })

  it('renders module checkboxes', () => {
    render(<ProvisionInstanceModal {...defaultProps} />)
    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('Élio IA')).toBeTruthy()
    expect(screen.getByText('Documents')).toBeTruthy()
  })

  it('renders tier select with options', () => {
    render(<ProvisionInstanceModal {...defaultProps} />)
    const tierSelect = screen.getByLabelText(/Tier Élio/i)
    expect(tierSelect).toBeTruthy()
    // Use getAllByText for "Base" since "Supabase" in the cost hint also matches /Base/i
    expect(screen.getAllByText(/Base/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Essentiel/i)).toBeTruthy()
    expect(screen.getByText(/Agentique/i)).toBeTruthy()
  })

  it('shows slug validation error for invalid format', async () => {
    render(<ProvisionInstanceModal {...defaultProps} />)
    const slugInput = screen.getByLabelText(/Sous-domaine/i)
    fireEvent.change(slugInput, { target: { value: 'AB' } })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.getByText(/Slug invalide/i)).toBeTruthy()
  })

  it('calls provisionOneInstanceFromHub with correct params on submit', async () => {
    vi.mocked(provisionOneInstanceFromHub).mockResolvedValue({
      data: {
        instanceId: 'inst-1',
        slug: 'acme-corp',
        instanceUrl: 'https://acme-corp.foxeo.io',
        supabaseProjectId: '',
        vercelProjectId: '',
      },
      error: null,
    })

    render(<ProvisionInstanceModal {...defaultProps} />)
    const submitBtn = screen.getByText('Lancer le provisioning')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(provisionOneInstanceFromHub).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: '11111111-1111-1111-1111-111111111111',
          slug: 'acme-corp',
        })
      )
    })
  })

  it('shows error message when action fails', async () => {
    vi.mocked(provisionOneInstanceFromHub).mockResolvedValue({
      data: null,
      error: { message: 'Échec Supabase API', code: 'SUPABASE_API_ERROR' },
    })

    render(<ProvisionInstanceModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Lancer le provisioning'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy()
    })
    expect(screen.getByText('Échec Supabase API')).toBeTruthy()
    expect(vi.mocked(showError)).toHaveBeenCalled()
  })

  it('shows Réessayer button on failure', async () => {
    vi.mocked(provisionOneInstanceFromHub).mockResolvedValue({
      data: null,
      error: { message: 'Erreur', code: 'VERCEL_API_ERROR' },
    })

    render(<ProvisionInstanceModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Lancer le provisioning'))

    await waitFor(() => {
      expect(screen.getByText('Réessayer')).toBeTruthy()
    })
  })

  it('calls onSuccess and shows success toast on success', async () => {
    vi.mocked(provisionOneInstanceFromHub).mockResolvedValue({
      data: {
        instanceId: 'inst-1',
        slug: 'acme-corp',
        instanceUrl: 'https://acme-corp.foxeo.io',
        supabaseProjectId: '',
        vercelProjectId: '',
      },
      error: null,
    })

    render(<ProvisionInstanceModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Lancer le provisioning'))

    await waitFor(() => {
      expect(vi.mocked(showSuccess)).toHaveBeenCalled()
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('https://acme-corp.foxeo.io')
    })
  })
})
