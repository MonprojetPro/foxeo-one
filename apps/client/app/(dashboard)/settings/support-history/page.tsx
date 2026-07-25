import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { Shield, Clock, Activity } from 'lucide-react'
import { format, formatDistanceStrict } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ImpersonationSession {
  id: string
  started_at: string
  ended_at: string | null
  status: string
  actions_count: number
  expires_at: string
}

interface SessionAction {
  action: string
  occurred_at: string
  zone: string | null
}

/**
 * Libellés en clair des actions métier susceptibles d'être effectuées pendant une
 * session support.
 *
 * Retour MiKL (2026-07-25) : « ça n'a pas de sens que le client voie qu'il y a eu tant
 * d'actions menées, s'il ne sait pas ce qui a été fait ». Un compteur nu n'informe pas,
 * il inquiète. On nomme donc chaque action.
 */
const ACTION_LABELS: Record<string, string> = {
  submission_sent: 'Envoi d\'une soumission d\'étape',
  parcours_abandoned: 'Demande d\'abandon du parcours',
  data_export_requested: 'Demande d\'export de vos données',
}

function labelForAction(action: SessionAction): string {
  return ACTION_LABELS[action.action] ?? action.action.replace(/_/g, ' ')
}

export default async function SupportHistoryPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-4 text-muted-foreground">
        Vous devez être connecté pour accéder à cette page.
      </div>
    )
  }

  // Fetch client
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    return (
      <div className="p-4 text-muted-foreground">
        Compte client introuvable.
      </div>
    )
  }

  // Fetch impersonation sessions for this client
  const { data: sessions, error } = await supabase
    .from('impersonation_sessions')
    .select('id, started_at, ended_at, status, actions_count, expires_at')
    .eq('client_id', client.id)
    .order('started_at', { ascending: false })
    .limit(50)

  const typedSessions = (sessions ?? []) as ImpersonationSession[]

  // Détail des actions — uniquement pour les sessions qui en comptent (les autres sont
  // de la consultation seule). Le détail passe par une fonction SECURITY DEFINER :
  // activity_logs n'est pas lisible par le client.
  const actionsBySession = new Map<string, SessionAction[]>()

  await Promise.all(
    typedSessions
      .filter((session) => session.actions_count > 0)
      .map(async (session) => {
        const { data } = await supabase.rpc('fn_get_impersonation_session_actions', {
          p_session_id: session.id,
        })
        if (data) actionsBySession.set(session.id, data as SessionAction[])
      })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-orange-400" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Historique support</h2>
          <p className="text-sm text-muted-foreground">
            Sessions de support technique effectuées par MiKL sur votre compte. Chaque
            session indique sa date, sa durée et les modifications effectuées.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Erreur lors du chargement de l&apos;historique.
        </div>
      )}

      {typedSessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Shield className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Aucune session de support enregistrée.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {typedSessions.map((session) => {
            const startDate = new Date(session.started_at)
            const endDate = session.ended_at ? new Date(session.ended_at) : null
            const duration = endDate
              ? formatDistanceStrict(endDate, startDate, { locale: fr })
              : 'En cours'

            const statusLabel =
              session.status === 'active'
                ? 'En cours'
                : session.status === 'expired'
                  ? 'Expirée'
                  : 'Terminée'

            const statusColor =
              session.status === 'active'
                ? 'text-orange-400'
                : session.status === 'expired'
                  ? 'text-yellow-400'
                  : 'text-green-400'

            const actions = actionsBySession.get(session.id) ?? []
            const isOngoing = session.status === 'active'

            return (
              <div
                key={session.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(startDate, 'd MMMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Durée : {duration}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Le détail n'est établi qu'à la clôture : pendant une session en cours,
                    afficher « 0 modification » serait faux. */}
                {!isOngoing && (
                  <div className="mt-3 border-t border-border pt-3">
                    {actions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Consultation uniquement — aucune modification de vos données.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {actions.map((action, index) => (
                          <li
                            key={`${session.id}-${index}`}
                            className="flex items-center gap-2 text-xs text-foreground"
                          >
                            <Activity className="h-3 w-3 shrink-0 text-orange-400" />
                            <span>{labelForAction(action)}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(action.occurred_at), 'HH:mm', { locale: fr })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
