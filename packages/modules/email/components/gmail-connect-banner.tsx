'use client'

import { useState } from 'react'
import { Button } from '@monprojetpro/ui'
import { showError } from '@monprojetpro/ui'
import { AlertTriangle, Mail, Unplug } from 'lucide-react'
import { revokeGmail } from '../actions/revoke-gmail'
import type { GmailConnectionState } from '../types/email.types'

interface GmailConnectBannerProps {
  returnTo: string
  connected: boolean
  connectedEmail: string | null
  /**
   * T-055 — « jamais connecté » et « connexion morte » ne se soignent pas
   * pareil : l'un demande de connecter, l'autre de RE-connecter un compte
   * précis. Sans cette distinction, une panne de six mois s'affichait
   * « Connecté ».
   */
  state?: GmailConnectionState
  onDisconnected: () => void
}

export function GmailConnectBanner({ returnTo, connected, connectedEmail, state, onDisconnected }: GmailConnectBannerProps) {
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

  // Connexion expirée — l'état qui manquait, et qui a laissé croire pendant
  // six mois que tout allait bien.
  if (state === 'expired') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 py-8 text-center"
        data-testid="gmail-expired-banner"
      >
        <div className="rounded-full bg-amber-500/15 p-4">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <div className="px-4">
          <p className="text-sm font-medium text-amber-200">Connexion Gmail expirée</p>
          <p className="mt-1 text-xs text-amber-200/80">
            {connectedEmail ? <>Le compte <strong>{connectedEmail}</strong> n&apos;est plus autorisé.</> : 'Le compte n&apos;est plus autorisé.'}{' '}
            Aucun email ne peut être lu ni envoyé tant que la connexion n&apos;est pas rétablie.
          </p>
        </div>
        <Button asChild size="sm">
          <a href={`/api/gmail/auth?returnTo=${encodeURIComponent(returnTo)}`}>
            <Mail className="mr-2 h-4 w-4" />
            Reconnecter Gmail
          </a>
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
