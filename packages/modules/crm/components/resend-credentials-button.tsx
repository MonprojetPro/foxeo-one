'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { showSuccess, showError } from '@monprojetpro/ui'
import { resendClientCredentials } from '../actions/resend-client-credentials'

interface ResendCredentialsButtonProps {
  clientId: string
  authUserId: string | null | undefined
  welcomeEmailSentAt: string | null | undefined
}

// T-067e — pastille d'état compte/email + action de renvoi, dans le header de la fiche
// client (décision MiKL 03-11 : à côté des pastilles Lab/One/tier, pas un encart séparé).
export function ResendCredentialsButton({ clientId, authUserId, welcomeEmailSentAt }: ResendCredentialsButtonProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleResend = () => {
    startTransition(async () => {
      const result = await resendClientCredentials(clientId)

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Identifiants envoyés au client')
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    })
  }

  const label = !authUserId
    ? 'Pas de compte'
    : welcomeEmailSentAt
      ? `Identifiants envoyés le ${format(new Date(welcomeEmailSentAt), 'd MMM', { locale: fr })}`
      : 'Email non envoyé'

  const toneClass = !authUserId || !welcomeEmailSentAt
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
    : 'bg-white/[0.03] text-gray-500 border-white/10 hover:bg-white/[0.08] hover:text-gray-300'

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={isPending}
      data-testid="resend-credentials-button"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer disabled:opacity-60 ${toneClass}`}
      title={`${label} · cliquer pour renvoyer les identifiants`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${!authUserId || !welcomeEmailSentAt ? 'bg-amber-400' : 'bg-gray-600'}`} />
      {isPending ? 'Envoi...' : label}
    </button>
  )
}
