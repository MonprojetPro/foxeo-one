import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeetingList } from './meeting-list'
import type { Meeting } from '../types/meeting.types'

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

const mockMeeting: Meeting = {
  id: '00000000-0000-0000-0000-000000000003',
  clientId: CLIENT_ID,
  operatorId: '00000000-0000-0000-0000-000000000002',
  title: 'Réunion de suivi Q1',
  description: null,
  scheduledAt: '2026-03-01T10:00:00.000Z',
  startedAt: null,
  endedAt: null,
  durationSeconds: null,
  meetSpaceName: null,
  meetUri: null,
  status: 'scheduled',
  type: 'standard',
  metadata: {},
  recordingUrl: null,
  transcriptUrl: null,
  createdAt: '2026-02-20T10:00:00.000Z',
  updatedAt: '2026-02-20T10:00:00.000Z',
}

const mockInProgressMeeting: Meeting = {
  ...mockMeeting,
  id: '00000000-0000-0000-0000-000000000004',
  title: 'Meeting en cours',
  status: 'in_progress',
  startedAt: '2026-03-01T10:00:00.000Z',
  meetUri: 'https://meet.google.com/abc-def-ghi',
}

describe('MeetingList', () => {
  it('renders meeting titles', () => {
    render(<MeetingList meetings={[mockMeeting]} />)
    expect(screen.getByText('Réunion de suivi Q1')).toBeDefined()
  })

  it('renders empty state when no meetings', () => {
    render(<MeetingList meetings={[]} />)
    expect(screen.getByText(/aucun meeting/i)).toBeDefined()
  })

  it('renders status badge for each meeting', () => {
    render(<MeetingList meetings={[mockMeeting]} />)
    expect(screen.getByText('Planifié')).toBeDefined()
  })

  it('renders join button for in_progress meetings', () => {
    render(<MeetingList meetings={[mockInProgressMeeting]} />)
    expect(screen.getByRole('link', { name: /rejoindre/i })).toBeDefined()
  })

  it('does not render join button for scheduled meetings', () => {
    render(<MeetingList meetings={[mockMeeting]} />)
    const joinLink = screen.queryByRole('link', { name: /rejoindre/i })
    expect(joinLink).toBeNull()
  })

  it('renders multiple meetings', () => {
    render(<MeetingList meetings={[mockMeeting, mockInProgressMeeting]} />)
    expect(screen.getByText('Réunion de suivi Q1')).toBeDefined()
    expect(screen.getByText('Meeting en cours')).toBeDefined()
  })
})
