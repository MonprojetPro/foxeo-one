import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecordingList } from './recording-list'
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

  it('shows Google Drive link when recordingUrl is set', () => {
    render(<RecordingList recordings={[mockRecording]} />)
    const link = screen.getByText('Enregistrement (Google Drive)')
    expect(link.closest('a')?.getAttribute('href')).toBe(mockRecording.recordingUrl)
    expect(link.closest('a')?.getAttribute('target')).toBe('_blank')
  })

  it('shows processing message when recordingUrl is empty', () => {
    const rec = { ...mockRecording, recordingUrl: '' }
    render(<RecordingList recordings={[rec]} />)
    expect(screen.getByText('En cours de traitement...')).toBeDefined()
  })

  it('shows Google Docs link when transcription is completed', () => {
    render(<RecordingList recordings={[completedRecording]} />)
    const link = screen.getByText('Transcription (Google Docs)')
    expect(link.closest('a')?.getAttribute('href')).toBe(completedRecording.transcriptUrl)
    expect(link.closest('a')?.getAttribute('target')).toBe('_blank')
  })

  it('does not show Google Docs link when transcription is pending', () => {
    render(<RecordingList recordings={[mockRecording]} />)
    expect(screen.queryByText('Transcription (Google Docs)')).toBeNull()
  })

  it('does not show Google Docs link when transcription is processing', () => {
    render(<RecordingList recordings={[processingRecording]} />)
    expect(screen.queryByText('Transcription (Google Docs)')).toBeNull()
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
