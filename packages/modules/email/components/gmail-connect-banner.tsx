'use client'

import { useState } from 'react'
import { Button } from '@monprojetpro/ui'
import { showError } from '@monprojetpro/ui'
import { Mail, Unplug } from 'lucide-react'
import { revokeGmail } from '../actions/revoke-gmail'

interface GmailConnectBannerProps {
  returnTo: string
  connected: boolean
  connectedEmail: string | null
  onDisconnected: () => void
}

export function GmailConnectBanner({ returnTo, connected, connectedEmail, onDisconnected }: GmailConnectBannerProps) {
  const [isRevoking, setIsRevoking] = useState(false)

  async function handleRevoke() {
    setIsRevoking(true)
    const result = await revokeGmail()
    setIsRevoking(false)
    if (result.error) {
      showError(result.error.message)
    } else {
      onDisconnected()
    }
  }

  if (connected && connectedEmail) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Connecté avec</span>
          <span className="font-medium text-foreground">{connectedEmail}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRevoke}
          disabled={isRevoking}
          className="text-xs text-muted-foreground gap-1.5"
        >
          <Unplug className="h-3 w-3" />
          Déconnecter
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-12 text-center">
      <div className="rounded-full bg-muted/30 p-4">
        <Mail className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <div>
        <p className="font-medium text-sm">Connecte ton compte Gmail</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pour voir et envoyer des emails depuis la fiche client
        </p>
      </div>
      <Button asChild size="sm">
        <a href={`/api/gmail/auth?returnTo=${encodeURIComponent(returnTo)}`}>
          <Mail className="h-4 w-4 mr-2" />
          Connecter Gmail
        </a>
      </Button>
    </div>
  )
}
