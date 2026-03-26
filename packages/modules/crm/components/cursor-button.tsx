'use client'

import { Button } from '@foxeo/ui'
import { showSuccess, showInfo } from '@foxeo/ui'
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
  const clientSlug = buildClientSlug(clientName, companyName)
  const bmadPath = buildBmadPath(clientSlug)
  const cursorUrl = buildCursorUrl(bmadPath)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bmadPath)
      showSuccess('Chemin copié : ' + bmadPath)
    } catch {
      showInfo('Chemin : ' + bmadPath)
    }
  }

  const handleOpenCursor = () => {
    window.location.href = cursorUrl
    // Fallback : copie le chemin après 1.5s si Cursor ne s'ouvre pas
    setTimeout(() => {
      handleCopy()
    }, 1500)
  }

  if (!folderExists) {
    return (
      <Button variant="outline" size="sm" onClick={handleCopy}>
        Copier chemin BMAD
      </Button>
    )
  }

  return (
    <Button onClick={handleOpenCursor} variant="outline" size="sm">
      Ouvrir dans Cursor
    </Button>
  )
}
