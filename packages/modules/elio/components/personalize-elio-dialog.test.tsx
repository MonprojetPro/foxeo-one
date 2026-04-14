import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PersonalizeElioDialog } from './personalize-elio-dialog'

const mockCreateProfile = vi.fn()

vi.mock('../actions/create-communication-profile', () => ({
  createCommunicationProfile: (...args: unknown[]) => mockCreateProfile(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PersonalizeElioDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateProfile.mockResolvedValue({ data: { id: 'profile-1' }, error: null })
  })

  it('renders when isOpen=true', () => {
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={vi.fn()} />
    )
    expect(screen.getByText('Personnalisons Élio')).toBeDefined()
  })

  it('does not show content when isOpen=false', () => {
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={false} onClose={vi.fn()} />
    )
    expect(screen.queryByText('Personnalisons Élio')).toBeNull()
  })

  it('shows all 4 question sections', () => {
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={vi.fn()} />
    )
    expect(screen.getByText('Quel ton préférez-vous ?')).toBeDefined()
    expect(screen.getByText('Longueur des réponses ?')).toBeDefined()
    expect(screen.getByText('Comment souhaitez-vous interagir ?')).toBeDefined()
    expect(screen.getByText("Type d'explications ?")).toBeDefined()
  })

  it('shows Passer (skip) and Enregistrer (save) buttons', () => {
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={vi.fn()} />
    )
    expect(screen.getByText('Passer')).toBeDefined()
    expect(screen.getByText('Enregistrer')).toBeDefined()
  })

  it('calls onClose when "Passer" is clicked', async () => {
    const onClose = vi.fn()
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={onClose} />
    )
    await userEvent.click(screen.getByText('Passer'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls createCommunicationProfile when "Enregistrer" is clicked', async () => {
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={vi.fn()} />
    )
    await userEvent.click(screen.getByText('Enregistrer'))
    expect(mockCreateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: '00000000-0000-0000-0000-000000000002' })
    )
  })

  it('calls onClose after successful profile creation', async () => {
    const onClose = vi.fn()
    render(
      <PersonalizeElioDialog clientId="00000000-0000-0000-0000-000000000002" isOpen={true} onClose={onClose} />
    )
    await userEvent.click(screen.getByText('Enregistrer'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
