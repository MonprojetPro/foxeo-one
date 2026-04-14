'use client'

import { Archive } from 'lucide-react'
import { Button, toast } from '@monprojetpro/ui'
import { useSyncDocuments } from '../hooks/use-sync-documents'

interface SyncToZipButtonProps {
  clientId: string
  documentCount: number
}

/**
 * Bouton "Sync vers BMAD" — génère et télécharge une archive ZIP de tous les
 * documents `visibility='shared'` du client.
 *
 * AC2: Téléchargement automatique du ZIP via URL.createObjectURL + <a download>
 * AC3: Toast confirmation après succès + invalidation cache TanStack Query
 */
export function SyncToZipButton({ clientId, documentCount }: SyncToZipButtonProps) {
  const { syncAsync, isPending } = useSyncDocuments(clientId)

  const handleSync = async () => {
    try {
      const result = await syncAsync(clientId)

      if (result.error) {
        toast.error(result.error.message)
        return
      }

      if (!result.data) {
        toast.error('Erreur inattendue lors de la génération du ZIP')
        return
      }

      const { zipBase64, zipUrl, count } = result.data
      const dateStr = new Date().toISOString().split('T')[0]
      const fileName = `documents-bmad-${clientId.slice(0, 8)}-${dateStr}.zip`

      if (zipUrl) {
        // ZIP volumineux → téléchargement direct via signed URL Storage
        const a = window.document.createElement('a')
        a.href = zipUrl
        a.download = fileName
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)
      } else if (zipBase64) {
        // ZIP petit → décoder base64 et déclencher le téléchargement
        const binaryStr = atob(zipBase64)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }

        const blob = new Blob([bytes], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = fileName
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)

        // Cleanup après délai pour éviter race condition
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        toast.error('Erreur : aucune donnée ZIP retournée')
        return
      }

      toast.success(`Archive ZIP prête (${count} document${count > 1 ? 's' : ''})`)
    } catch (error) {
      toast.error('Erreur lors de la synchronisation')
      console.error('[SYNC_TO_ZIP_BUTTON]', error)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isPending || documentCount === 0}
      data-testid="sync-to-zip-button"
    >
      <Archive className="h-4 w-4 mr-2" />
      {isPending
        ? 'Génération ZIP...'
        : `Sync vers BMAD (${documentCount} docs partagés)`}
    </Button>
  )
}
