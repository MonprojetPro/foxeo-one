import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// ─── Mocks hoistés ────────────────────────────────────────────────────────────

const { mockReopenStep, mockShowSuccess, mockShowError, mockInvalidateQueries } = vi.hoisted(() => ({
  mockReopenStep: vi.fn(),
  mockShowSuccess: vi.fn(),
  mockShowError: vi.fn(),
  mockInvalidateQueries: vi.fn(),
}))

vi.mock('../actions/reopen-step', () => ({
  reopenStep: mockReopenStep,
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  }
})

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_ID = '00000000-0000-0000-0000-000000000010'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'
const STEP_NUMBER = 3

// ─── Tests ────────────────────────────────────────────────────────────────────

import { ReopenStepButton } from './reopen-step-button'

describe('ReopenStepButton — affichage initial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le bouton "Rouvrir cette étape" par défaut', () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    expect(screen.getByRole('button', { name: /rouvrir cette étape/i })).toBeInTheDocument()
  })

  it("n'affiche pas le textarea par défaut", () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('ReopenStepButton — expansion au clic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le textarea et les boutons de confirmation au clic', () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))

    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmer la réouverture/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
  })

  it('affiche le numéro de l\'étape dans le message de confirmation', () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))

    expect(screen.getByText(/étape 3/i)).toBeInTheDocument()
  })

  it('referme le panel au clic sur Annuler', () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rouvrir cette étape/i })).toBeInTheDocument()
  })
})

describe('ReopenStepButton — succès', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReopenStep.mockResolvedValue({ data: { reopened: true }, error: null })
  })

  it('appelle reopenStep avec stepId au clic confirmer', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockReopenStep).toHaveBeenCalledWith({ stepId: STEP_ID, reason: undefined })
    })
  })

  it('passe la raison quand saisie', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Corriger le positionnement' },
    })
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockReopenStep).toHaveBeenCalledWith({
        stepId: STEP_ID,
        reason: 'Corriger le positionnement',
      })
    })
  })

  it('affiche un toast succès après réouverture', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Étape rouverte avec succès')
    })
  })

  it('invalide les queries après succès', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })
  })

  it('appelle onReopened callback après succès', async () => {
    const onReopened = vi.fn()
    render(
      <ReopenStepButton
        stepId={STEP_ID}
        clientId={CLIENT_ID}
        stepNumber={STEP_NUMBER}
        onReopened={onReopened}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(onReopened).toHaveBeenCalledTimes(1)
    })
  })

  it('referme le panel après succès', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })
})

describe('ReopenStepButton — erreur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReopenStep.mockResolvedValue({
      data: null,
      error: { message: 'Accès refusé', code: 'FORBIDDEN' },
    })
  })

  it('affiche un toast erreur en cas d\'échec', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Accès refusé')
    })
  })

  it('garde le panel ouvert en cas d\'erreur', async () => {
    render(
      <ReopenStepButton stepId={STEP_ID} clientId={CLIENT_ID} stepNumber={STEP_NUMBER} />
    )
    fireEvent.click(screen.getByRole('button', { name: /rouvrir cette étape/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmer la réouverture/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalled()
    })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
