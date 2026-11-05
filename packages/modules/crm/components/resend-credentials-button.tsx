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
  /** T-073a — première connexion réelle (clients.first_login_at). null = jamais activé. */
  firstLoginAt: string | null | undefined
  /** T-073d — Lab ou One réellement activé (vrais flags, jamais dashboard_type). */
  hasAnyAccess: boolean
}

// T-067e — pastille d'état compte/email + action de renvoi, dans le header de la fiche
// client (décision MiKL 03-11 : à côté des pastilles Lab/One/tier, pas un encart séparé).
// T-073a — le libellé est un STATUT (ce qui s'est réellement passé), jamais une condition
// qui masquerait le bouton : MiKL doit toujours pouvoir renvoyer un lien frais, mais doit
// voir d'un coup d'œil si le client a déjà activé son espace ou non (clients.first_login_at),
// pas seulement si un email est parti — un email envoyé ne prouve pas qu'il a été utilisé.
export function ResendCredentialsButton({ clientId, authUserId, welcomeEmailSentAt, firstLoginAt, hasAnyAccess }: ResendCredentialsButtonProps) {
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

  // T-073d — sans accès réellement déclenché (Lab ou One), ce bouton n'a rien à
  // renvoyer : il ne doit plus jamais inventer un mode à la place de MiKL.
  const label = !hasAnyAccess
    ? 'Aucune création'
    : !authUserId
      ? 'Aucune création'
      : firstLoginAt
        ? 'Espace actif'
        : 'Renvoyer le lien'

  // Vert = le client a vraiment activé son espace. Ambre = il reste quelque chose à faire
  // (créer le compte, ou relancer un lien que le client n'a jamais utilisé).
  const toneClass = firstLoginAt
    ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'

  const subtitle = authUserId && welcomeEmailSentAt
    ? ` (dernier envoi le ${format(new Date(welcomeEmailSentAt), 'd MMM', { locale: fr })})`
    : ''

  const title = hasAnyAccess
    ? `${label}${subtitle} · cliquer pour renvoyer le lien`
    : 'Aucun espace activé — utilise « Activer le Lab » ou ouvre l\'accès One avant de pouvoir envoyer un lien'

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={isPending || !hasAnyAccess}
      data-testid="resend-credentials-button"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors cursor-pointer disabled:opacity-60 ${toneClass}`}
      title={title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${firstLoginAt ? 'bg-green-400' : 'bg-amber-400'}`} />
      {isPending ? 'Envoi...' : label}
    </button>
  )
}
