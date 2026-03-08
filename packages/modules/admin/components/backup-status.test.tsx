import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BackupStatus } from './backup-status'
import * as useBackupModule from '../hooks/use-backup-status'
import * as triggerModule from '../actions/trigger-backup'

vi.mock('../hooks/use-backup-status')
vi.mock('../actions/trigger-backup')
vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@foxeo/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

const mockBackupData = {
  lastDailyBackup: null,
  lastWeeklyBackup: {
    date: '2026-03-09T03:00:00.000Z',
    status: 'success' as const,
    clientsCount: 3,
    sizeBytes: 2048,
    triggeredBy: 'cron' as const,
  },
  backupHistory: [
    {
      date: '2026-03-09T03:00:00.000Z',
      status: 'success' as const,
      clientsCount: 3,
      sizeBytes: 2048,
      triggeredBy: 'cron' as const,
    },
    {
      date: '2026-03-02T03:00:00.000Z',
      status: 'partial' as const,
      clientsCount: 2,
      sizeBytes: 1024,
      triggeredBy: 'cron' as const,
    },
  ],
}

describe('BackupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useBackupModule.useBackupStatus).mockReturnValue({
      data: mockBackupData,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBackupModule.useBackupStatus>)
  })

  it('renders loading skeletons when pending', () => {
    vi.mocked(useBackupModule.useBackupStatus).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof useBackupModule.useBackupStatus>)

    render(<BackupStatus />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders the two backup status cards', () => {
    render(<BackupStatus />)
    expect(screen.getByText('Backup quotidien (natif)')).toBeTruthy()
    expect(screen.getByText('Backup hebdomadaire (cold)')).toBeTruthy()
  })

  it('renders backup history entries', () => {
    render(<BackupStatus />)
    expect(screen.getByText(/Historique des backups \(2\)/i)).toBeTruthy()
    // Two entries in history
    const successBadges = screen.getAllByText('Succès')
    expect(successBadges.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Partiel')).toBeTruthy()
  })

  it('calls triggerManualBackup on backup button click', async () => {
    vi.mocked(triggerModule.triggerManualBackup).mockResolvedValue({
      data: { triggered: true },
      error: null,
    })

    render(<BackupStatus />)
    const btn = screen.getByRole('button', { name: /Déclencher un backup manuel/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(vi.mocked(triggerModule.triggerManualBackup)).toHaveBeenCalledTimes(1)
    })
  })

  it('restore modal requires typing RESTAURER to enable confirmation', () => {
    render(<BackupStatus />)

    // Open restore modal
    const restoreBtn = screen.getByRole('button', { name: /Restaurer/i })
    fireEvent.click(restoreBtn)

    // Confirmation button should be disabled initially
    const confirmBtn = screen.getByRole('button', { name: /Confirmer la restauration/i })
    expect(confirmBtn).toBeDisabled()

    // Type wrong text — still disabled
    const input = screen.getByLabelText(/Confirmation restauration/i)
    fireEvent.change(input, { target: { value: 'WRONG' } })
    expect(confirmBtn).toBeDisabled()

    // Type RESTAURER — enabled
    fireEvent.change(input, { target: { value: 'RESTAURER' } })
    expect(confirmBtn).not.toBeDisabled()
  })
})
