'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGoogleDriveStatus, configureGoogleDrive, updateGoogleDriveFolderId } from '../actions/configure-google-drive'
import { showSuccess, showError } from '@monprojetpro/ui'
import { HardDrive, Check, Settings } from 'lucide-react'

export function GoogleDriveConfig() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isInitialSetup, setIsInitialSetup] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [folderId, setFolderId] = useState('')
  const [isSaving, startSave] = useTransition()

  const { data: status, isPending } = useQuery({
    queryKey: ['google-drive-config'],
    queryFn: async () => {
      const result = await getGoogleDriveStatus()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 5 * 60 * 1_000,
  })

  const isConfigured = status?.isConfigured ?? false

  function handleEdit() {
    setFolderId(status?.folderId ?? '')
    setIsEditing(true)
    setIsInitialSetup(false)
  }

  function handleInitialSetup() {
    setFolderId('')
    setAccessToken('')
    setRefreshToken('')
    setIsInitialSetup(true)
  }

  function handleSave() {
    startSave(async () => {
      if (isInitialSetup || !isConfigured) {
        // First-time setup: requires all fields
        if (!accessToken || !refreshToken || !folderId) {
          showError('Tous les champs sont requis pour la configuration initiale')
          return
        }
        const result = await configureGoogleDrive(accessToken, refreshToken, folderId)
        if (result.error) {
          showError(result.error.message)
          return
        }
      } else {
        // Edit mode: only update folder ID
        if (!folderId) {
          showError('L\'ID du dossier est requis')
          return
        }
        const result = await updateGoogleDriveFolderId(folderId)
        if (result.error) {
          showError(result.error.message)
          return
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['google-drive-config'] })
      showSuccess('Google Drive configuré')
      setIsEditing(false)
      setIsInitialSetup(false)
      setAccessToken('')
      setRefreshToken('')
    })
  }

  if (isPending) {
    return (
      <div className="rounded-lg border border-border p-4 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
      </div>
    )
  }

  // Connected state — show status + edit button
  if (isConfigured && !isEditing && !isInitialSetup) {
    return (
      <div className="rounded-lg border border-border p-4 flex items-center justify-between" data-testid="drive-config-connected">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Google Drive connecté</p>
            <p className="text-xs text-muted-foreground">
              Dossier : {status?.folderId}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleEdit}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          Modifier
        </button>
      </div>
    )
  }

  // Form state — initial setup or editing
  const showTokenFields = isInitialSetup || !isConfigured

  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-4" data-testid="drive-config-form">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {isEditing ? 'Modifier le dossier Drive' : 'Connecter Google Drive'}
          </p>
          <p className="text-xs text-muted-foreground">
            Pennylane lira automatiquement les fichiers dans ce dossier
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">ID du dossier Drive</label>
          <input
            type="text"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            placeholder="ex: 1AbCdEfGhIjKlMnOpQrStUvWxYz"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="drive-folder-id"
          />
        </div>

        {showTokenFields && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Access token Google OAuth"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="drive-access-token"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Refresh Token</label>
              <input
                type="password"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="Refresh token Google OAuth"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="drive-refresh-token"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !folderId}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          data-testid="drive-save-btn"
        >
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {(isEditing || isInitialSetup) && (
          <button
            type="button"
            onClick={() => { setIsEditing(false); setIsInitialSetup(false) }}
            className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Annuler
          </button>
        )}
        {isConfigured && isEditing && (
          <button
            type="button"
            onClick={handleInitialSetup}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto self-center"
          >
            Reconfigurer les tokens
          </button>
        )}
      </div>
    </div>
  )
}
