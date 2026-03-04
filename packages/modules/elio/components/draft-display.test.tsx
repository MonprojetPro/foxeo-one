import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DraftDisplay } from './draft-display'

const mockClipboardWrite = vi.fn().mockResolvedValue(undefined)

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@foxeo/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
  }
})

// navigator.clipboard mock via defineProperty
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockClipboardWrite },
  configurable: true,
  writable: true,
})

describe('DraftDisplay (Story 8.6 — Task 4)', () => {
  it('Task 4.1 — affiche le brouillon dans une bulle spéciale', () => {
    render(
      <DraftDisplay
        draft="Bonjour Sandrine,\n\nVotre devis est prêt."
        draftType="email"
      />,
    )
    expect(screen.getByTestId('draft-display')).toBeDefined()
    expect(screen.getByTestId('draft-content')).toBeDefined()
  })

  it('Task 4.1 — affiche le label du type de brouillon (email)', () => {
    render(
      <DraftDisplay
        draft="Brouillon test"
        draftType="email"
      />,
    )
    expect(screen.getByText(/Brouillon généré — Email/i)).toBeDefined()
  })

  it('Task 4.1 — affiche le label du type de brouillon (validation_hub)', () => {
    render(
      <DraftDisplay
        draft="Brouillon test"
        draftType="validation_hub"
      />,
    )
    expect(screen.getByText(/Validation Hub/i)).toBeDefined()
  })

  it('Task 4.2 — bouton Copier appelle navigator.clipboard.writeText', async () => {
    render(
      <DraftDisplay
        draft="Texte à copier"
        draftType="email"
      />,
    )
    const copyBtn = screen.getByTestId('draft-copy-btn')
    fireEvent.click(copyBtn)
    expect(mockClipboardWrite).toHaveBeenCalledWith('Texte à copier')
  })

  it('Task 4.3 — bouton Modifier affiche un input pour les ajustements', () => {
    render(
      <DraftDisplay
        draft="Brouillon"
        draftType="email"
      />,
    )
    const modifyBtn = screen.getByTestId('draft-modify-btn')
    fireEvent.click(modifyBtn)
    expect(screen.getByTestId('draft-adjust-input')).toBeDefined()
  })

  it('Task 4.3 — ajustement envoyé via onModify au Enter', () => {
    const onModify = vi.fn()
    render(
      <DraftDisplay
        draft="Brouillon"
        draftType="email"
        onModify={onModify}
      />,
    )
    fireEvent.click(screen.getByTestId('draft-modify-btn'))
    const input = screen.getByTestId('draft-adjust-input')
    fireEvent.change(input, { target: { value: 'Plus court' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onModify).toHaveBeenCalledWith('Plus court')
  })

  it('Task 4.4 — bouton Envoyer visible seulement si draftType=chat et onSend fourni', () => {
    const onSend = vi.fn()
    render(
      <DraftDisplay
        draft="Salut Thomas !"
        draftType="chat"
        onSend={onSend}
      />,
    )
    const sendBtn = screen.queryByTestId('draft-send-btn')
    expect(sendBtn).toBeTruthy()
  })

  it('Task 4.4 — bouton Envoyer absent si draftType=email', () => {
    render(
      <DraftDisplay
        draft="Email brouillon"
        draftType="email"
        onSend={vi.fn()}
      />,
    )
    const sendBtn = screen.queryByTestId('draft-send-btn')
    expect(sendBtn).toBeNull()
  })

  it('Task 4.4 — bouton Envoyer absent si onSend non fourni (même si chat)', () => {
    render(
      <DraftDisplay
        draft="Message chat"
        draftType="chat"
      />,
    )
    const sendBtn = screen.queryByTestId('draft-send-btn')
    expect(sendBtn).toBeNull()
  })

  it('affiche "Version N" si version > 1', () => {
    render(
      <DraftDisplay
        draft="Brouillon v2"
        draftType="email"
        version={2}
      />,
    )
    expect(screen.getByText(/version 2/i)).toBeDefined()
  })
})
