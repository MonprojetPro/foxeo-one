'use client'

import { Hammer } from 'lucide-react'
import { useToolPosts } from '../hooks/use-tool-posts'
import { useSuiviOutilRealtime } from '../hooks/use-suivi-outil-realtime'
import { ToolPostCard } from './tool-post-card'

interface ToolPostsFeedProps {
  clientId: string
  isOperator?: boolean
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3 animate-pulse">
          <div className="flex justify-between">
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-white/10" />
              <div className="h-2 w-20 rounded bg-white/10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded bg-white/10" />
            <div className="h-2.5 w-4/5 rounded bg-white/10" />
            <div className="h-2.5 w-3/5 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/5 p-4 mb-4">
        <Hammer size={28} className="text-white/30" />
      </div>
      <h3 className="text-sm font-medium text-white/60 mb-1">Pas encore de mise à jour</h3>
      <p className="text-xs text-white/40 max-w-xs">
        Votre opérateur publiera ici l'avancement du développement de votre outil.
      </p>
    </div>
  )
}

export function ToolPostsFeed({ clientId, isOperator = false }: ToolPostsFeedProps) {
  // Subscription Realtime
  useSuiviOutilRealtime(clientId)

  const { posts, isPending, isError } = useToolPosts(clientId)

  if (isPending) return <FeedSkeleton />

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-center">
        <p className="text-sm text-red-400">
          Impossible de charger les mises à jour. Rechargez la page.
        </p>
      </div>
    )
  }

  if (posts.length === 0) return <EmptyState />

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ToolPostCard
          key={post.id}
          post={post}
          isOperator={isOperator}
          clientId={clientId}
        />
      ))}
    </div>
  )
}
