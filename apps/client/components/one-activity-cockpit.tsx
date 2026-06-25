'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { formatRelativeDate } from '@monprojetpro/utils'
import {
  useToolPosts,
  useSuiviOutilRealtime,
} from '@monprojetpro/module-suivi-outil'
import {
  useNotifications,
  useNotificationsRealtime,
} from '@monprojetpro/modules-notifications'
import {
  toolPostVisual,
  notificationVisual,
  type OneActivityVisual,
} from './one-activity-config'

interface OneActivityCockpitProps {
  clientId: string
  /** Auth user id — destinataire des notifications (recipient_id = auth_user_id). */
  userId: string
}

/** Élément normalisé de la timeline du cockpit (source agnostique). */
interface CockpitActivity {
  id: string
  title: string
  detail: string | null
  createdAt: string
  href: string
  visual: OneActivityVisual
}

const MAX_ITEMS = 6

/**
 * Cockpit d'activités de l'accueil One.
 *
 * Remplace l'ancien `ActivityFeed` (raccourcis statiques bidon) par de VRAIES données,
 * fusionnées depuis deux sources déjà branchées Realtime :
 *   • Suivi de l'outil → useToolPosts + useSuiviOutilRealtime (tool_posts)
 *   • Notifications    → useNotifications + useNotificationsRealtime (notifications)
 *
 * Conçu pour s'ÉTENDRE : ajouter une source = pousser ses items normalisés dans `activities`
 * (mêmes champs CockpitActivity) — la grille et le tri par date n'ont pas à changer.
 */
export function OneActivityCockpit({ clientId, userId }: OneActivityCockpitProps) {
  // ── Sources réelles + Realtime ────────────────────────────────────────────
  useSuiviOutilRealtime(clientId)
  useNotificationsRealtime(userId)

  const { posts, isPending: postsPending } = useToolPosts(clientId)
  const { data: notifications, isPending: notifsPending } = useNotifications(userId)

  const isPending = postsPending || notifsPending

  // ── Normalisation + fusion + tri par date décroissante ────────────────────
  const activities = useMemo<CockpitActivity[]>(() => {
    const fromPosts: CockpitActivity[] = (posts ?? []).map((p) => ({
      id: `post-${p.id}`,
      title: p.title?.trim() || 'Nouvelle actualité de ton outil',
      detail: p.body ? p.body.slice(0, 120) : null,
      createdAt: p.createdAt,
      href: '/modules/suivi-outil',
      visual: toolPostVisual(),
    }))

    const fromNotifs: CockpitActivity[] = (notifications ?? []).map((n) => ({
      id: `notif-${n.id}`,
      title: n.title,
      detail: n.body,
      createdAt: n.createdAt,
      href: n.link || '/modules/notifications',
      visual: notificationVisual(n.type),
    }))

    return [...fromPosts, ...fromNotifs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_ITEMS)
  }, [posts, notifications])

  return (
    <section aria-label="Activité de ton espace">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-[#f9fafb]">Activité de ton espace</h2>
        <Link
          href="/modules/notifications"
          className="text-[12px] text-[#9ca3af] transition-colors hover:text-[#f9fafb]"
        >
          Tout voir →
        </Link>
      </div>

      <div className="rounded-xl border border-[#2d2d2d] bg-[#141414] p-2">
        {isPending ? (
          <CockpitSkeleton />
        ) : activities.length === 0 ? (
          <CockpitEmpty />
        ) : (
          <ul className="divide-y divide-[#1f1f1f]">
            {activities.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.visual.iconClass}`}
                    aria-hidden="true"
                  >
                    <a.visual.Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-[#f3f4f6]">{a.title}</p>
                    {a.detail && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-[#9ca3af]">{a.detail}</p>
                    )}
                    <p className="mt-1 text-[11px] text-[#6b7280]">
                      {formatRelativeDate(a.createdAt)}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-[#3d3d3d] transition-colors group-hover:text-[#9ca3af]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function CockpitSkeleton() {
  return (
    <ul className="divide-y divide-[#1f1f1f]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-start gap-3 p-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-[#1f1f1f]" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-[#1f1f1f]" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-[#1a1a1a]" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function CockpitEmpty() {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-[13px] text-[#9ca3af]">Aucune activité pour le moment.</p>
      <p className="mt-1 text-[12px] text-[#6b7280]">
        Les actualités de ton outil et tes notifications apparaîtront ici.
      </p>
    </div>
  )
}
