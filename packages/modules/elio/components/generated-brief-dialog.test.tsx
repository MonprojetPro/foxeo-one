import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GeneratedBriefDialog } from './generated-brief-dialog'

// Mock server actions (local to elio module)
vi.mock('../actions/generate-brief', () => ({
  generateBrief: vi.fn(),
}))

vi.mock('../actions/submit-elio-brief', () => ({
  submitElioBrief: vi.fn(),
}))

// Mock @monprojetpro/ui
vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}))

import { generateBrief } from '../actions/generate-brief'
import { submitElioBrief } from '../actions/submit-elio-brief'
import { showSuccess, showError } from '@monprojetpro/ui'
import { useRouter } from 'next/navigation'

const mockPush = vi.fn()

describe('GeneratedBriefDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush })
    ;(generateBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { brief: '# Mon Brief\n\nContenu du brief généré.' },
      error: null,
    })
    ;(submitElioBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { submissionId: 'sub-123' },
      error: null,
    })
  })

  it('ne rend rien quand isOpen est false', () => {
    render(
      <GeneratedBriefDialog isOpen={false} onClose={vi.fn()} stepId="step-1" />
    )
    expect(screen.queryByText('Votre brief généré par Élio')).toBeNull()
  })

  it('affiche le dialog quand isOpen est true', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    expect(screen.getByText('Votre brief généré par Élio')).toBeDefined()
  })

  it('déclenche generateBrief à l\'ouverture', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(generateBrief).toHaveBeenCalledWith('step-1')
    })
  })

  it('affiche le skeleton pendant la génération', async () => {
    ;(generateBrief as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { brief: '# Brief' }, error: null }), 100))
    )
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    expect(screen.getByText("Élio génère votre brief...")).toBeDefined()
  })

  it('affiche le brief généré après chargement', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    expect(screen.getByText('Mon Brief')).toBeDefined()
  })

  it('bascule en mode édition au clic sur "Éditer"', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    const editButton = screen.getByText('Éditer')
    await userEvent.click(editButton)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDefined()
  })

  it('permet de modifier le brief en mode édition', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    await userEvent.click(screen.getByText('Éditer'))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Mon brief modifié')
    expect(textarea.value).toContain('Mon brief modifié')
  })

  it('bascule en aperçu au clic sur "Aperçu" depuis le mode édition', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    await userEvent.click(screen.getByText('Éditer'))
    await userEvent.click(screen.getByText('Aperçu'))
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('régénère le brief au clic sur "Régénérer"', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    const regenerateButton = screen.getByText('Régénérer')
    await userEvent.click(regenerateButton)
    await waitFor(() => {
      expect(generateBrief).toHaveBeenCalledTimes(2)
    })
  })

  it('soumet le brief et affiche un toast succès', async () => {
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    await userEvent.click(screen.getByText('Soumettre pour validation'))
    await waitFor(() => {
      expect(submitElioBrief).toHaveBeenCalledWith({
        stepId: 'step-1',
        content: '# Mon Brief\n\nContenu du brief généré.',
      })
      expect(showSuccess).toHaveBeenCalled()
    })
  })

  it('affiche une erreur toast si la génération échoue', async () => {
    ;(generateBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Erreur API', code: 'API_ERROR' },
    })
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Erreur API')
    })
  })

  it('affiche une erreur toast si la soumission échoue', async () => {
    ;(submitElioBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'Erreur soumission', code: 'DATABASE_ERROR' },
    })
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    await userEvent.click(screen.getByText('Soumettre pour validation'))
    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Erreur soumission')
    })
  })

  it('désactive "Soumettre" si brief vide', async () => {
    ;(generateBrief as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { brief: '' },
      error: null,
    })
    render(
      <GeneratedBriefDialog isOpen={true} onClose={vi.fn()} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    const submitBtn = screen.getByText('Soumettre pour validation')
    expect(submitBtn.closest('button')?.disabled).toBe(true)
  })

  it('redirige après soumission réussie', async () => {
    const onClose = vi.fn()
    render(
      <GeneratedBriefDialog isOpen={true} onClose={onClose} stepId="step-1" />
    )
    await waitFor(() => {
      expect(screen.queryByText("Élio génère votre brief...")).toBeNull()
    })
    await userEvent.click(screen.getByText('Soumettre pour validation'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/modules/parcours')
    })
  })
})
