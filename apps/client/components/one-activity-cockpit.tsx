'use client'

import { useMemo } from 'react'
import {
  AlertCircle,
  Megaphone,
  MessageSquare,
  FileText,
  Video,
  CreditCard,
  CheckCircle2,
  HeartHandshake,
} from 'lucide-react'
import { formatRelativeDate } from '@monprojetpro/utils'
import { useToolPosts, useSuiviOutilRealtime } from '@monprojetpro/module-suivi-outil'
import { useChatMessages, useChatRealtime } from '@monprojetpro/modules-chat'
import { useDocuments, useDocumentsRealtime } from '@monprojetpro/module-documents'
import { useMeetings, useCoachingInfo, useCoachingRealtime } from '@monprojetpro/module-visio'
import { useSupportTickets, useSupportTicketsRealtime } from '@monprojetpro/modules-support'
import {
  CockpitCard,
  CockpitMetric,
  CockpitBigNumber,
  CockpitEmptyLine,
  CockpitCardSkeleton,
} from './one-cockpit-card'
import {
  useOneCockpitSummary,
  useOneCockpitSummaryRealtime,
} from './use-one-cockpit-summary'
import { openElioOnePopup } from './use-elio-one-popup'

interface OneActivityCockpitProps {
  clientId: string
  /** Auth user id — destinataire des notifications (recipient_id = auth_user_id). */
  userId: string
}

const TIER_LABEL: Record<'one' | 'one_plus', { name: string; price: string }> = {
  one: { name: 'One', price: '49 €/mois' },
  one_plus: { name: 'One+', price: '99 €/mois' },
}

/** Formate une date relative, ou « — » si absente. */
function rel(date: string | null | undefined): string {
  return date ? formatRelativeDate(date) : '—'
}

/**
 * Cockpit de l'accueil One (vision v2) — façon cockpit Hub, adapté à l'usage des fonctionnalités One.
 *
 * Grille de cartes thématiques, chacune branchée sur une VRAIE source (zéro coquille vide) :
 *   • À traiter        → demandes d'évolution en attente (validation_requests) + tickets support ouverts
 *   • Suivi de l'outil → tool_posts (count + dernière activité)
 *   • Messages         → messages non lus de MiKL (sender_type='operator', read_at null)
 *   • Documents        → documents du client (count + dernier livraison)
 *   • Visio            → prochain RDV planifié (sinon dernier terminé)
 *   • Coaching (One+)  → solde de crédits + prochaine séance coaching (ledger + meetings)
 *   • Mon abonnement   → tier One/One+ (client_configs.elio_tier)
 *
 * Tout est branché Realtime (suivi-outil, chat, documents, support, validation_requests,
 * coaching_credit_ledger + meetings pour la carte Coaching) — un chiffre bouge dès que la
 * donnée change, sans rafraîchir la page.
 */
export function OneActivityCockpit({ clientId, userId: _userId }: OneActivityCockpitProps) {
  // ── Realtime : chaque source garde son canal déjà éprouvé ─────────────────
  useSuiviOutilRealtime(clientId)
  useChatRealtime(clientId)
  useDocumentsRealtime(clientId)
  useSupportTicketsRealtime()
  useOneCockpitSummaryRealtime(clientId)

  // ── Sources réelles ────────────────────────────────────────────────────────
  const { posts, isPending: postsPending } = useToolPosts(clientId)
  const { messages, isPending: messagesPending } = useChatMessages(clientId)
  const { documents, isPending: documentsPending } = useDocuments(clientId)
  const { data: scheduledMeetings, isPending: scheduledPending } = useMeetings({
    clientId,
    status: 'scheduled',
  })
  const { data: completedMeetings, isPending: completedPending } = useMeetings({
    clientId,
    status: 'completed',
  })
  const { data: tickets, isPending: ticketsPending } = useSupportTickets({ clientId })
  const { data: summary, isPending: summaryPending } = useOneCockpitSummary(clientId)

  // ── Dérivés ──────────────────────────────────────────────────────────────
  const lastPostAt = posts[0]?.createdAt ?? null

  const unreadFromMiKL = useMemo(
    () => messages.filter((m) => m.senderType === 'operator' && !m.readAt).length,
    [messages]
  )

  const lastDocument = useMemo(() => {
    if (documents.length === 0) return null
    return [...documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
  }, [documents])

  const nextMeeting = useMemo(() => {
    const upcoming = (scheduledMeetings ?? [])
      .filter((m) => new Date(m.scheduledAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    return upcoming[0] ?? null
  }, [scheduledMeetings])

  const lastMeeting = useMemo(() => {
    const past = (completedMeetings ?? []).sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    )
    return past[0] ?? null
  }, [completedMeetings])

  const openTickets = useMemo(
    () => (tickets ?? []).filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    [tickets]
  )

  const evolutionPending = summary?.evolutionPendingCount ?? 0
  const todoCount = evolutionPending + openTickets
  const tier = summary?.elioTier ?? 'one'

  // ── Coaching One+ (carte visible seulement en tier one_plus) ─────────────
  const isOnePlus = tier === 'one_plus'
  // Realtime : ledger de crédits + meetings (réservation/annulation Cal.com) — no-op si non One+
  useCoachingRealtime(isOnePlus ? clientId : undefined)
  const { data: coaching, isPending: coachingPending } = useCoachingInfo(clientId, isOnePlus)

  return (
    <section aria-label="Cockpit de ton espace One">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-[#f9fafb]">Cockpit de ton espace</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ───────────── À traiter ───────────── */}
        {summaryPending || ticketsPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="À traiter"
            Icon={AlertCircle}
            accent="amber"
            href={openTickets > 0 ? '/modules/support' : undefined}
            onClick={openTickets > 0 ? undefined : openElioOnePopup}
            linkLabel={todoCount > 0 ? 'Ouvrir' : 'Tout est à jour'}
            badge={todoCount}
          >
            {todoCount === 0 ? (
              <div className="flex items-center gap-2 py-1 text-[13px] text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Rien à traiter pour le moment.
              </div>
            ) : (
              <div className="space-y-1">
                {evolutionPending > 0 && (
                  <CockpitMetric
                    label="Demande(s) d'évolution en attente"
                    value={evolutionPending}
                    emphasis
                  />
                )}
                {openTickets > 0 && (
                  <CockpitMetric label="Ticket(s) support ouvert(s)" value={openTickets} emphasis />
                )}
              </div>
            )}
          </CockpitCard>
        )}

        {/* ───────────── Suivi de l'outil ───────────── */}
        {postsPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="Suivi de l'outil"
            Icon={Megaphone}
            accent="emerald"
            href="/modules/suivi-outil"
            linkLabel="Ouvrir le suivi"
          >
            {posts.length === 0 ? (
              <CockpitEmptyLine>Aucune publication pour l'instant.</CockpitEmptyLine>
            ) : (
              <>
                <CockpitBigNumber value={posts.length} suffix={posts.length > 1 ? 'publications' : 'publication'} />
                <div className="mt-2">
                  <CockpitMetric label="Dernière activité" value={rel(lastPostAt)} />
                </div>
              </>
            )}
          </CockpitCard>
        )}

        {/* ───────────── Messages ───────────── */}
        {messagesPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="Messages"
            Icon={MessageSquare}
            accent="indigo"
            href="/modules/chat"
            linkLabel="Ouvrir le chat"
            badge={unreadFromMiKL}
          >
            {unreadFromMiKL > 0 ? (
              <>
                <CockpitBigNumber
                  value={unreadFromMiKL}
                  suffix={unreadFromMiKL > 1 ? 'non lus' : 'non lu'}
                />
                <div className="mt-2">
                  <CockpitMetric label="De la part de" value="MiKL" />
                </div>
              </>
            ) : (
              <CockpitEmptyLine>
                {messages.length === 0
                  ? 'Aucun message. Écris à MiKL quand tu veux.'
                  : 'Tu es à jour avec MiKL.'}
              </CockpitEmptyLine>
            )}
          </CockpitCard>
        )}

        {/* ───────────── Documents ───────────── */}
        {documentsPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="Documents"
            Icon={FileText}
            accent="sky"
            href="/modules/documents"
            linkLabel="Voir mes documents"
          >
            {documents.length === 0 ? (
              <CockpitEmptyLine>Aucun document pour l'instant.</CockpitEmptyLine>
            ) : (
              <>
                <CockpitBigNumber
                  value={documents.length}
                  suffix={documents.length > 1 ? 'documents' : 'document'}
                />
                {lastDocument && (
                  <div className="mt-2 space-y-0.5">
                    <CockpitMetric label="Dernier" value={rel(lastDocument.createdAt)} />
                    <p className="truncate text-[12px] text-[#9ca3af]">{lastDocument.name}</p>
                  </div>
                )}
              </>
            )}
          </CockpitCard>
        )}

        {/* ───────────── Visio ───────────── */}
        {scheduledPending || completedPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="Visio"
            Icon={Video}
            accent="violet"
            href="/modules/visio"
            linkLabel="Ouvrir la visio"
          >
            {nextMeeting ? (
              <>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-300/80">
                  Prochain rendez-vous
                </p>
                <p className="truncate text-[14px] font-semibold text-[#f9fafb]">
                  {nextMeeting.title}
                </p>
                <div className="mt-1.5">
                  <CockpitMetric label="Quand" value={rel(nextMeeting.scheduledAt)} />
                </div>
              </>
            ) : lastMeeting ? (
              <>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
                  Aucun RDV à venir
                </p>
                <CockpitMetric label="Dernière visio" value={rel(lastMeeting.scheduledAt)} />
              </>
            ) : (
              <CockpitEmptyLine>Aucune visio planifiée.</CockpitEmptyLine>
            )}
          </CockpitCard>
        )}

        {/* ───────────── Coaching (One+ uniquement) ───────────── */}
        {isOnePlus &&
          (coachingPending ? (
            <CockpitCardSkeleton />
          ) : (
            <CockpitCard
              title="Coaching"
              Icon={HeartHandshake}
              accent="rose"
              href="/modules/visio"
              linkLabel="Réserver une séance"
              badge={coaching?.balance ?? 0}
            >
              <div className="space-y-0.5">
                <CockpitMetric
                  label="Séances incluses restantes"
                  value={coaching?.balance ?? 0}
                  emphasis
                />
                {coaching?.nextSessionAt ? (
                  <>
                    <CockpitMetric label="Prochaine séance" value={rel(coaching.nextSessionAt)} />
                    {coaching.nextSessionTitle && (
                      <p className="truncate text-[12px] text-[#9ca3af]">
                        {coaching.nextSessionTitle}
                      </p>
                    )}
                  </>
                ) : (
                  <CockpitEmptyLine>
                    {(coaching?.balance ?? 0) > 0
                      ? 'Aucune séance planifiée — réserve ton créneau.'
                      : 'Crédit épuisé — prochaine séance : 45 € (hors forfait).'}
                  </CockpitEmptyLine>
                )}
              </div>
            </CockpitCard>
          ))}

        {/* ───────────── Mon abonnement ───────────── */}
        {summaryPending ? (
          <CockpitCardSkeleton />
        ) : (
          <CockpitCard
            title="Mon abonnement"
            Icon={CreditCard}
            accent="cyan"
            href="/settings/billing"
            linkLabel="Mes factures"
          >
            <div className="space-y-0.5">
              <CockpitMetric label="Offre" value={TIER_LABEL[tier].name} emphasis />
              <CockpitMetric label="Mensuel" value={TIER_LABEL[tier].price} />
            </div>
          </CockpitCard>
        )}
      </div>
    </section>
  )
}
