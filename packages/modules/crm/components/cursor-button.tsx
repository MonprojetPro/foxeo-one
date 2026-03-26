'use client'

import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  showSuccess,
} from '@foxeo/ui'
import {
  buildClientSlug,
  buildBmadPath,
  buildCursorUrl,
} from '../utils/cursor-integration'

interface CursorButtonProps {
  clientName: string
  companyName?: string
  folderExists?: boolean
}

export function CursorButton({
  clientName,
  companyName,
  folderExists = true,
}: CursorButtonProps) {
  const [showFallback, setShowFallback] = useState(false)

  const clientSlug = buildClientSlug(clientName, companyName)
  const bmadPath = buildBmadPath(clientSlug)
  const cursorUrl = buildCursorUrl(bmadPath)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bmadPath)
      showSuccess('Chemin copié dans le presse-papier')
    } catch {
      // Fallback silencieux — le chemin est visible dans le dialog
    }
  }

  const handleOpenCursor = () => {
    window.location.href = cursorUrl
    // Ouvre le dialog fallback après 1.5s si Cursor ne s'ouvre pas
    setTimeout(() => {
      setShowFallback(true)
    }, 1500)
  }

  return (
    <>
      <Button
        onClick={folderExists ? handleOpenCursor : () => setShowFallback(true)}
        variant="outline"
        size="sm"
      >
        Ouvrir dans Cursor
      </Button>

      <Dialog open={showFallback} onOpenChange={setShowFallback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir dans Cursor</DialogTitle>
            <DialogDescription>
              {folderExists
                ? 'Le protocole Cursor n\'est pas supporté par votre navigateur. Copiez le chemin et ouvrez-le manuellement (File → Open Folder).'
                : 'Le dossier BMAD de ce client n\'existe pas encore. Créez-le d\'abord à l\'emplacement ci-dessous.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
            <code className="flex-1 text-sm break-all">{bmadPath}</code>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              Copier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
