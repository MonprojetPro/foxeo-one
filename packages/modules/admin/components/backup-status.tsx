'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { useBackupStatus, type BackupEntry } from '../hooks/use-backup-status'
import { triggerManualBackup } from '../actions/trigger-backup'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function statusBadge(status: BackupEntry['status']) {
  const map: Record<BackupEntry['status'], { label: string; className: string }> = {
    success: { label: 'Succès', className: 'text-green-400 bg-green-400/10 border-green-400/20' },
    partial: { label: 'Partiel', className: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
    failed: { label: 'Échec', className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  }
  const { label, className } = map[status]
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${className}`}>{label}</span>
  )
}

function BackupCard({
  title,
  subtitle,
  entry,
}: {
  title: string
  subtitle: string
  entry: BackupEntry | null
}) {
  return (
    <div className="rounded bg-white/5 border border-white/10 p-4 space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-200">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      {entry ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {statusBadge(entry.status)}
            <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
          </div>
          <p className="text-xs text-gray-500">
            {entry.clientsCount} client(s) • {formatBytes(entry.sizeBytes)} •{' '}
            {entry.triggeredBy === 'manual' ? 'Manuel' : 'Automatique'}
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Aucun backup enregistré</p>
      )}
    </div>
  )
}

export function BackupStatus() {
  const { data, isPending } = useBackupStatus()
  const queryClient = useQueryClient()
  const [triggering, setTriggering] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreConfirmText, setRestoreConfirmText] = useState('')

  async function handleManualBackup() {
    setTriggering(true)
    const result = await triggerManualBackup()
    setTriggering(false)

    if (result.error) {
      showError(result.error.message)
    } else {
      showSuccess('Backup manuel déclenché — il sera disponible dans quelques minutes')
      queryClient.invalidateQueries({ queryKey: ['system-config', 'backup'] })
    }
  }

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  const history = data?.backupHistory ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Last backups status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BackupCard
          title="Backup quotidien (natif)"
          subtitle="Géré par Supabase Pro — rétention 30 jours"
          entry={data?.lastDailyBackup ?? null}
        />
        <BackupCard
          title="Backup hebdomadaire (cold)"
          subtitle="Export JSON applicatif — rétention 52 semaines"
          entry={data?.lastWeeklyBackup ?? null}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleManualBackup}
          disabled={triggering}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {triggering ? 'Déclenchement…' : 'Déclencher un backup manuel'}
        </button>
        <button
          type="button"
          onClick={() => setShowRestoreModal(true)}
          className="px-4 py-2 rounded text-sm font-medium border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
        >
          Restaurer
        </button>
      </div>

      {/* Restore modal */}
      {showRestoreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmation de restauration"
          onClick={() => { setShowRestoreModal(false); setRestoreConfirmText('') }}
        >
          <div className="bg-[#0d0d0d] border border-white/10 rounded-lg p-6 max-w-md w-full space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-gray-100">Restauration</h2>
            <p className="text-sm text-gray-400">
              La restauration d&apos;un backup est une opération manuelle qui nécessite
              l&apos;intervention du support Supabase. Cette action ne peut pas être annulée.
            </p>
            <p className="text-sm text-gray-300">
              Tapez <span className="font-mono bg-white/10 px-1 rounded">RESTAURER</span> pour
              confirmer.
            </p>
            <input
              type="text"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="RESTAURER"
              className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-500"
              aria-label="Confirmation restauration"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false)
                  setRestoreConfirmText('')
                }}
                className="px-4 py-2 rounded text-sm border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={restoreConfirmText !== 'RESTAURER'}
                onClick={() => {
                  setShowRestoreModal(false)
                  setRestoreConfirmText('')
                  showSuccess(
                    'Demande de restauration enregistrée — contactez le support Supabase pour procéder'
                  )
                }}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Confirmer la restauration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup history */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Historique des backups ({history.length})
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Aucun backup dans l&apos;historique</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded bg-white/5 border border-white/10 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  {statusBadge(entry.status)}
                  <span className="text-xs text-gray-300">{formatDate(entry.date)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {entry.clientsCount} client(s) • {formatBytes(entry.sizeBytes)} •{' '}
                  {entry.triggeredBy === 'manual' ? 'Manuel' : 'Auto'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
