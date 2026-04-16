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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-orange-400" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Historique support</h2>
          <p className="text-sm text-muted-foreground">
            Sessions de support technique effectuées par MiKL sur votre compte.
            Toutes les actions sont enregistrées pour votre transparence.
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
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {session.actions_count} action{session.actions_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
