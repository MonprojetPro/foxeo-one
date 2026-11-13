// ============================================================
// T-087 — la ligne de visio porte TOUTES les actions
// ============================================================
// Ce que ces tests verrouillent, et pourquoi :
//
//   MiKL, 13-11, devant la page Visio du Hub : « je ne peux pas supprimer les
//   visio ?! ». L'annulation existait pourtant, codée et testée — mais branchée
//   sur le seul dossier client. La page Visio, elle, ne savait que démarrer.
//   Deux écrans pour la même chose, chacun amputé de ce que l'autre savait
//   faire. C'est le piège déjà payé sur la fiche client (deux surfaces
//   d'actions) et sur les factures (colonne écrite, jamais lue).
//
//   Ces tests empêchent la divergence de revenir : chaque action est servie par
//   CETTE brique, et n'apparaît que si l'écran l'a réellement branchée.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingRow } from './meeting-row'
import type { Meeting } from '../types/meeting.types'

vi.mock('@monprojetpro/ui', async () => {
  const reel = await vi.importActual<Record<string, unknown>>('@monprojetpro/ui')
  return { ...reel, showSuccess: vi.fn(), showError: vi.fn() }
})

const MEETING: Meeting = {
  id: '00000000-0000-0000-0000-000000000003',
  clientId: '00000000-0000-0000-0000-000000000001',
  operatorId: '00000000-0000-0000-0000-000000000002',
  title: 'test visio',
  description: null,
  scheduledAt: '2026-11-13T18:30:00.000Z',
  startedAt: null,
  endedAt: null,
  durationSeconds: null,
  meetSpaceName: 'spaces/abc',
  meetUri: 'https://meet.google.com/abc-def-ghi',
  status: 'scheduled',
  type: 'standard',
  metadata: {},
  recordingUrl: null,
  transcriptUrl: null,
  inviteLastSentAt: null,
  inviteLastSentTo: null,
  inviteSentCount: 0,
  isFree: true,
  priceCents: null,
  createdAt: '2026-11-13T18:16:00.000Z',
  updatedAt: '2026-11-13T18:16:00.000Z',
}

const ok = () => Promise.resolve({ data: {}, error: null })

beforeEach(() => vi.clearAllMocks())

describe('MeetingRow — parité des actions entre les écrans (T-087)', () => {
  it('un rendez-vous à venir peut être ANNULÉ et DÉPLACÉ, pas seulement rejoint', () => {
    render(
      <MeetingRow meeting={MEETING} onCancel={vi.fn(ok)} onReschedule={vi.fn(ok)} />
    )
    expect(screen.getByRole('button', { name: /Annuler/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Déplacer/ })).toBeTruthy()
  })

  it('« Démarrer » n’apparaît QUE si l’écran l’a branché', () => {
    const { unmount } = render(<MeetingRow meeting={MEETING} />)
    expect(screen.queryByRole('button', { name: /Démarrer/ })).toBeNull()
    unmount()

    render(<MeetingRow meeting={MEETING} onStart={vi.fn(ok)} />)
    expect(screen.getByRole('button', { name: /Démarrer/ })).toBeTruthy()
  })

  it('« Terminer » remplace « Démarrer » dès que la visio est en cours', () => {
    render(
      <MeetingRow
        meeting={{ ...MEETING, status: 'in_progress' }}
        onStart={vi.fn(ok)}
        onEnd={vi.fn(ok)}
      />
    )
    expect(screen.queryByRole('button', { name: /Démarrer/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Terminer/ })).toBeTruthy()
  })

  it('démarrer appelle l’action avec CE rendez-vous, puis prévient l’écran', async () => {
    const onStart = vi.fn(ok)
    const onChanged = vi.fn()
    render(<MeetingRow meeting={MEETING} onStart={onStart} onChanged={onChanged} />)

    await userEvent.click(screen.getByRole('button', { name: /Démarrer/ }))

    expect(onStart).toHaveBeenCalledWith({ meetingId: MEETING.id })
    expect(onChanged).toHaveBeenCalled()
  })

  it('un échec serveur ne fait PAS croire que c’est fait', async () => {
    const onEnd = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'Session déjà close', code: 'X' } })
    )
    const onChanged = vi.fn()
    render(
      <MeetingRow
        meeting={{ ...MEETING, status: 'in_progress' }}
        onEnd={onEnd}
        onChanged={onChanged}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /Terminer/ }))

    expect(onEnd).toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('un rendez-vous terminé ne se démarre ni ne s’annule plus', () => {
    render(
      <MeetingRow
        meeting={{ ...MEETING, status: 'completed' }}
        onStart={vi.fn(ok)}
        onEnd={vi.fn(ok)}
        onCancel={vi.fn(ok)}
      />
    )
    expect(screen.queryByRole('button', { name: /Démarrer/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Terminer/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Annuler/ })).toBeNull()
  })
})
