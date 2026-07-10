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
    /* Carte backup cockpit — verre sur fond noir */
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]">
      <div>
        <p className="text-sm font-medium text-gray-200">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      {entry ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {statusBadge(entry.status)}
            <span className="tabular-nums text-xs text-gray-500">{formatDate(entry.date)}</span>
          </div>
          <p className="tabular-nums text-xs text-gray-500">
            {entry.clientsCount} client(s) · {formatBytes(entry.sizeBytes)} ·{' '}
            {entry.triggeredBy === 'manual' ? 'Manuel' : 'Automatique'}
          </p>
        </div>
      ) : (
        <p className="text-xs italic text-gray-600">Aucun backup enregistré</p>
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
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    )
  }

  const history = data?.backupHistory ?? []

  return (
    <div className="max-w-2xl space-y-6">
      {/* Cartes dernier backup quotidien / hebdomadaire */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleManualBackup}
          disabled={triggering}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {triggering ? 'Déclenchement…' : 'Déclencher un backup manuel'}
        </button>
        <button
          type="button"
          onClick={() => setShowRestoreModal(true)}
          className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          Restaurer
        </button>
      </div>

      {/* Modale de confirmation restauration */}
      {showRestoreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmation de restauration"
          onClick={() => { setShowRestoreModal(false); setRestoreConfirmText('') }}
        >
          <div
            className="mx-4 w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-100">Restauration</h2>
            <p className="text-sm text-gray-400">
              La restauration d&apos;un backup est une opération manuelle qui nécessite
              l&apos;intervention du support Supabase. Cette action ne peut pas être annulée.
            </p>
            <p className="text-sm text-gray-300">
              Tapez{' '}
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">RESTAURER</span>{' '}
              pour confirmer.
            </p>
            <input
              type="text"
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="RESTAURER"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-red-500/50 focus:outline-none"
              aria-label="Confirmation restauration"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false)
                  setRestoreConfirmText('')
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/5"
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
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Confirmer la restauration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique des backups */}
      <div>
        <p className="mb-3 text-[0.7rem] font-medium uppercase tracking-wider text-gray-500">
          Historique des backups ({history.length})
        </p>
        {history.length === 0 ? (
          <p className="text-xs italic text-gray-600">Aucun backup dans l&apos;historique</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  {statusBadge(entry.status)}
                  <span className="tabular-nums text-xs text-gray-300">{formatDate(entry.date)}</span>
                </div>
                <div className="tabular-nums text-xs text-gray-500">
                  {entry.clientsCount} client(s) · {formatBytes(entry.sizeBytes)} ·{' '}
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
