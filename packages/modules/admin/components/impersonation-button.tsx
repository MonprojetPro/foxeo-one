'use client'

import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@monprojetpro/ui'
import { Shield } from 'lucide-react'
import { startImpersonation } from '../actions/start-impersonation'
import { IMPERSONATION_COOKIE_NAME } from '../utils/impersonation-guards'

interface ImpersonationButtonProps {
  clientId: string
  clientName: string
}

export function ImpersonationButton({ clientId, clientName }: ImpersonationButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)

    const result = await startImpersonation({ clientId })

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    if (result.data) {
      // Set impersonation cookie with session data
      const sessionData = JSON.stringify({
        sessionId: result.data.sessionId,
        clientId,
        expiresAt: result.data.expiresAt,
      })

      document.cookie = `${IMPERSONATION_COOKIE_NAME}=${encodeURIComponent(sessionData)}; path=/; max-age=3600; SameSite=Lax`

      // Redirect to client app
      window.open(result.data.redirectUrl, '_blank')
      setOpen(false)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10">
          <Shield className="h-4 w-4" />
          Se connecter comme {clientName}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-400" />
            Impersonation — {clientName}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Tu vas te connecter comme ce client. Voici ce qui va se passer :</p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              <li>Le client sera <strong>notifié par email</strong></li>
              <li>Toutes tes actions seront <strong>enregistrées</strong></li>
              <li>La session expire automatiquement après <strong>1 heure</strong></li>
              <li>Les actions destructives sont <strong>bloquées</strong></li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? 'Connexion...' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
