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
      // Correctif 2026-07-25 — On ne pose plus de cookie ici : il était écrit sur le
      // domaine du Hub, où rien ne le lit (la bannière et les garde-fous vivent sur
      // l'app client, autre sous-domaine → cookies séparés). Le cookie utile est posé
      // par la route /auth/impersonation de l'app client, en httpOnly.
      //
      // redirectUrl = lien de connexion à usage unique au compte client.
      // Pas de `noopener` : l'onglet doit rester fermable programmatiquement pour que
      // « Fermer la session » le referme (sinon deux onglets Hub restent ouverts).
      // La cible est notre propre app client, sur un domaine que l'on contrôle.
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
              <li>
                Tu seras <strong>réellement connecté</strong> sous son compte, dans un
                nouvel onglet — ta session Hub reste ouverte
              </li>
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
