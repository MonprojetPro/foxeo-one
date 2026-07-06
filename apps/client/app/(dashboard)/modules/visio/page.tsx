import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetings, MeetingStatusBadge, CalcomBookingWidget } from '@monprojetpro/module-visio'
import { ExternalLink, MessageSquare } from 'lucide-react'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

function normalizeCalcomUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default async function ClientVisioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Resolve Cal.com URL from operator's calendar_integrations
  let calcomUrl: string | null = null
  if (client.operator_id) {
    const { data: operator } = await supabase
      .from('operators')
      .select('auth_user_id')
      .eq('id', client.operator_id)
      .maybeSingle()

    if (operator?.auth_user_id) {
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('metadata')
        .eq('user_id', operator.auth_user_id)
        .eq('provider', 'calcom')
        .eq('connected', true)
        .maybeSingle()

      const url = (integration?.metadata as { url?: string } | null)?.url
      if (url) calcomUrl = normalizeCalcomUrl(url)
    }
  }

  // Coaching One+ — solde de crédits affiché au-dessus du widget de réservation.
  // Défensif : si la migration coaching n'est pas encore déployée, on masque le bandeau.
  let coachingBanner: { balance: number } | null = null
  const { data: config } = await supabase
    .from('client_configs')
    .select('elio_tier')
    .eq('client_id', client.id)
    .maybeSingle()

  if (config?.elio_tier === 'one_plus') {
    const { data: balance, error: balanceError } = await supabase.rpc('get_coaching_balance', {
      p_client_id: client.id,
    })
    if (!balanceError && typeof balance === 'number') {
      coachingBanner = { balance }
    }
  }

  const { data: meetings } = await getMeetings({ clientId: client.id })
  const allMeetings = meetings ?? []

  const nextMeeting = allMeetings
    .filter((m) => m.status === 'scheduled' || m.status === 'in_progress')
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''))[0] ?? null

  const pastMeetings = allMeetings
    .filter((m) => m.status === 'completed')
    .sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''))

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Mes réunions avec MiKL</h1>

      {/* Prochain meeting */}
      {nextMeeting && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prochain meeting</p>
            <p className="font-semibold">{nextMeeting.title}</p>
            <p className="text-sm text-muted-foreground">{formatDate(nextMeeting.scheduledAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <MeetingStatusBadge status={nextMeeting.status} />
            {nextMeeting.meetUri && (
              <a
                href={nextMeeting.meetUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <ExternalLink className="h-4 w-4" />
                Rejoindre sur Google Meet
              </a>
            )}
          </div>
        </div>
      )}

      {/* Prise de RDV */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Prendre rendez-vous</h2>
        {coachingBanner && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              coachingBanner.balance > 0
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
            data-testid="coaching-credits-banner"
          >
            {coachingBanner.balance > 0 ? (
              <>
                <span className="font-semibold">Coaching One+ :</span> il te reste{' '}
                {coachingBanner.balance} séance{coachingBanner.balance > 1 ? 's' : ''} incluse
                {coachingBanner.balance > 1 ? 's' : ''} dans ton abonnement.
              </>
            ) : (
              <>
                <span className="font-semibold">Coaching One+ :</span> ton crédit inclus est
                épuisé — prochaine séance : 45 €, ajoutés à ta prochaine facture.
              </>
            )}
          </div>
        )}
        {calcomUrl ? (
          <>
            <CalcomBookingWidget
              calcomUrl={calcomUrl}
              clientId={client.id}
              operatorId={client.operator_id ?? ''}
            />
            <p className="text-sm text-muted-foreground text-center">
              Pas de créneau disponible ?{' '}
              <a href="/modules/chat" className="inline-flex items-center gap-1 text-primary hover:underline">
                <MessageSquare className="h-3.5 w-3.5" />
                Contactez MiKL via le Chat
              </a>
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              La prise de RDV en ligne n&apos;est pas encore disponible.
            </p>
            <a
              href="/modules/chat"
              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Contactez MiKL via le Chat
            </a>
          </div>
        )}
      </div>

      {/* Réunions passées */}
      {pastMeetings.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Réunions passées</h2>
          <div className="flex flex-col gap-2">
            {pastMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(meeting.endedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {meeting.recordingUrl && (
                    <a
                      href={meeting.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Enregistrement
                    </a>
                  )}
                  {meeting.transcriptUrl && (
                    <a
                      href={meeting.transcriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Transcription
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!nextMeeting && pastMeetings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">Aucune réunion pour le moment.</p>
          <p className="mt-1 text-sm text-muted-foreground">Réservez un créneau ci-dessus pour démarrer.</p>
        </div>
      )}
    </div>
  )
}
