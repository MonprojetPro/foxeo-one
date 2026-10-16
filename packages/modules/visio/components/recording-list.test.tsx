import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordingList } from './recording-list'

/**
 * Les liens bruts vers Google ont été remplacés par des boutons qui passent
 * par les Server Actions (T-050) : c'est la seule façon de servir en priorité
 * le PDF déposé dans le dossier du client. Les tests vérifient donc l'APPEL
 * et l'ouverture, plus un attribut href qui ne disait rien du résultat.
 */

const mockDownloadTranscript = vi.fn()
const mockDownloadRecording = vi.fn()

vi.mock('../actions/download-transcript', () => ({
  downloadTranscript: (input: unknown) => mockDownloadTranscript(input),
}))
vi.mock('../actions/download-recording', () => ({
  downloadRecording: (input: unknown) => mockDownloadRecording(input),
}))
import type { MeetingRecording } from '../types/recording.types'

const RECORDING_ID = '00000000-0000-0000-0000-000000000001'
const MEETING_ID = '00000000-0000-0000-0000-000000000002'

const mockRecording: MeetingRecording = {
  id: RECORDING_ID,
  meetingId: MEETING_ID,
  recordingUrl: 'https://docs.google.com/file/d/rec123/view',
  recordingDurationSeconds: 3600,
  fileSizeBytes: 0,
  transcriptUrl: null,
  transcriptionStatus: 'pending',
  transcriptionLanguage: 'fr',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
}

const completedRecording: MeetingRecording = {
  ...mockRecording,
  id: '00000000-0000-0000-0000-000000000003',
  transcriptUrl: 'https://docs.google.com/document/d/trans456/view',
  transcriptionStatus: 'completed',
}

const processingRecording: MeetingRecording = {
  ...mockRecording,
  id: '00000000-0000-0000-0000-000000000004',
  transcriptionStatus: 'processing',
}

describe('RecordingList', () => {
  it('renders empty state when no recordings', () => {
    render(<RecordingList recordings={[]} />)
    expect(screen.getByText('Aucun enregistrement disponible')).toBeDefined()
  })

  it('renders duration in human-readable format', () => {
    render(<RecordingList recordings={[mockRecording]} />)
    expect(screen.getByText('1h 0min')).toBeDefined()
  })

  it('renders — when duration is 0', () => {
    const rec = { ...mockRecording, recordingDurationSeconds: 0 }
    render(<RecordingList recordings={[rec]} />)
    expect(screen.getByText('—')).toBeDefined()
  })

  it('ouvre l’enregistrement en passant par l’action, pas par un href figé', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    mockDownloadRecording.mockResolvedValue({
      data: { signedUrl: mockRecording.recordingUrl, source: 'google' },
      error: null,
    })

    render(<RecordingList recordings={[mockRecording]} />)
    await userEvent.click(screen.getByText('Enregistrement (Google Drive)'))

    await waitFor(() => {
      expect(mockDownloadRecording).toHaveBeenCalledWith({ recordingId: RECORDING_ID })
      expect(open).toHaveBeenCalledWith(mockRecording.recordingUrl, '_blank', 'noopener,noreferrer')
    })
    vi.unstubAllGlobals()
  })

  it('shows processing message when recordingUrl is empty', () => {
    const rec = { ...mockRecording, recordingUrl: '' }
    render(<RecordingList recordings={[rec]} />)
    expect(screen.getByText('En cours de traitement...')).toBeDefined()
  })

  it('ouvre LE DOCUMENT SERVI PAR L’ACTION — le PDF archivé prime sur Google', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)
    mockDownloadTranscript.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/compte-rendu.pdf', source: 'archive' },
      error: null,
    })

    render(<RecordingList recordings={[completedRecording]} />)
    await userEvent.click(screen.getByRole('button', { name: /Transcription/ }))

    await waitFor(() => {
      expect(mockDownloadTranscript).toHaveBeenCalledWith({ recordingId: completedRecording.id })
      expect(open).toHaveBeenCalledWith(
        'https://signed.test/compte-rendu.pdf',
        '_blank',
        'noopener,noreferrer'
      )
    })
    vi.unstubAllGlobals()
  })

  it('n’offre pas la transcription tant que Google ne l’a pas terminée', () => {
    render(<RecordingList recordings={[mockRecording]} />)
    // « Transcription » est aussi un en-tête de colonne : on vise le BOUTON.
    expect(screen.queryByRole('button', { name: /Transcription/ })).toBeNull()
  })

  it('n’offre pas la transcription pendant le traitement', () => {
    render(<RecordingList recordings={[processingRecording]} />)
    expect(screen.queryByRole('button', { name: /Transcription/ })).toBeNull()
  })

  it('shows pending status badge label', () => {
    render(<RecordingList recordings={[mockRecording]} />)
    expect(screen.getByText('En attente de traitement Google')).toBeDefined()
  })

  it('shows processing status badge label', () => {
    render(<RecordingList recordings={[processingRecording]} />)
    expect(screen.getByText('Gemini transcrit en cours...')).toBeDefined()
  })

  it('shows completed status badge label', () => {
    render(<RecordingList recordings={[completedRecording]} />)
    expect(screen.getByText('Disponible')).toBeDefined()
  })

  it('renders multiple recordings', () => {
    render(<RecordingList recordings={[mockRecording, completedRecording]} />)
    const driveLinks = screen.getAllByText('Enregistrement (Google Drive)')
    expect(driveLinks).toHaveLength(2)
  })
})
