import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ElioTransformPanel } from './elio-transform-panel'

vi.mock('@monprojetpro/module-elio', () => ({
  transformMessageForClient: vi.fn(),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="sheet">{children}</div> : null,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  }
})

import { transformMessageForClient } from '@monprojetpro/module-elio'
const mockTransform = vi.mocked(transformMessageForClient)

const defaultProps = {
  rawMessage: 'dis lui que le logo est pret',
  clientId: '00000000-0000-0000-0000-000000000001',
  onSend: vi.fn(),
  onSendRaw: vi.fn(),
  onCancel: vi.fn(),
  open: true,
}

describe('ElioTransformPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransform.mockResolvedValue({
      data: {
        transformedText: 'Bonjour ! Le logo est prêt, vous pouvez le valider.',
        profileUsed: { tone: 'Formel', length: 'Équilibré', style: 'Collaboratif' },
      },
      error: null,
    })
  })

  it('affiche le message brut', () => {
    render(<ElioTransformPanel {...defaultProps} />)
    expect(screen.getByText('dis lui que le logo est pret')).toBeTruthy()
  })

  it('appelle transformMessageForClient au montage', async () => {
    render(<ElioTransformPanel {...defaultProps} />)
    await waitFor(() => expect(mockTransform).toHaveBeenCalledWith({
      clientId: defaultProps.clientId,
      rawMessage: defaultProps.rawMessage,
    }))
  })

  it('affiche le message transformé après chargement', async () => {
    render(<ElioTransformPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Bonjour ! Le logo est prêt, vous pouvez le valider.')).toBeTruthy()
    })
  })

  it('appelle onSend avec le message transformé au clic Envoyer', async () => {
    render(<ElioTransformPanel {...defaultProps} />)
    await waitFor(() => screen.getByDisplayValue('Bonjour ! Le logo est prêt, vous pouvez le valider.'))
    fireEvent.click(screen.getByLabelText('Envoyer le message transformé'))
    expect(defaultProps.onSend).toHaveBeenCalledWith('Bonjour ! Le logo est prêt, vous pouvez le valider.')
  })

  it('appelle onSendRaw au clic "Envoyer sans transformer"', async () => {
    render(<ElioTransformPanel {...defaultProps} />)
    await waitFor(() => screen.getByLabelText('Envoyer sans transformer'))
    fireEvent.click(screen.getByLabelText('Envoyer sans transformer'))
    expect(defaultProps.onSendRaw).toHaveBeenCalled()
  })

  it('appelle onCancel au clic Annuler', async () => {
    render(<ElioTransformPanel {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Annuler'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('affiche une erreur si transformMessageForClient échoue', async () => {
    mockTransform.mockResolvedValueOnce({
      data: null,
      error: { message: 'Élio indisponible', code: 'LLM_ERROR' },
    })
    render(<ElioTransformPanel {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText("Élio n'a pas pu transformer le message")).toBeTruthy()
    })
  })

  it('ne se rend pas si open=false', () => {
    render(<ElioTransformPanel {...defaultProps} open={false} />)
    expect(screen.queryByTestId('sheet')).toBeNull()
  })
})
