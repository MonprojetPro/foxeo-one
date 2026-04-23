import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordingStatusBadge } from './recording-status-badge'
import type { TranscriptionStatus } from '../types/recording.types'

describe('RecordingStatusBadge', () => {
  const cases: Array<{ status: TranscriptionStatus; label: string }> = [
    { status: 'pending', label: 'En attente de traitement Google' },
    { status: 'processing', label: 'Gemini transcrit en cours...' },
    { status: 'completed', label: 'Disponible' },
    { status: 'failed', label: 'Non disponible' },
  ]

  cases.forEach(({ status, label }) => {
    it(`renders "${label}" for status "${status}"`, () => {
      render(<RecordingStatusBadge status={status} />)
      expect(screen.getByText(label)).toBeDefined()
    })
  })

  it('renders a badge element', () => {
    const { container } = render(<RecordingStatusBadge status="pending" />)
    expect(container.firstChild).toBeDefined()
  })
})
