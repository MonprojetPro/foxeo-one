'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { PenSquare, RefreshCw } from 'lucide-react'
import { getGmailStatus } from '../actions/get-gmail-status'
import { getClientThreads } from '../actions/get-client-threads'
import { GmailConnectBanner } from './gmail-connect-banner'
import { EmailThreadList } from './email-thread-list'
import { EmailThreadView } from './email-thread-view'
import { EmailComposer } from './email-composer'
import type { EmailThread } from '../types/email.types'

interface ClientEmailTabProps {
  clientId: string
  clientEmail: string
  returnTo: string
}

export function ClientEmailTab({ clientId, clientEmail, returnTo }: ClientEmailTabProps) {
  const queryClient = useQueryClient()
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)

  // Statut Gmail
  const { data: gmailStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => {
      const r = await getGmailStatus()
      return r.data ?? { connected: false, email: null }
    },
  })

  // Threads du client
  const { data: threads = [], isPending: threadsLoading, refetch: refetchThreads } = useQuery({
    queryKey: ['email-threads', clientId],
    queryFn: async () => {
      const r = await getClientThreads(clientId)
      return r.data ?? []
    },
    enabled: !!gmailStatus?.connected,
  })

  // Détecter retour OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url = new URL(window.location.href)

    if (params.get('gmail_connected') === '1') {
      showSuccess('Gmail connecté avec succès')
      refetchStatus()
      url.searchParams.delete('gmail_connected')
      window.history.replaceState({}, '', url.toString())
    } else if (params.get('gmail_error')) {
      const err = params.get('gmail_error')
      const detail = params.get('detail') ?? ''
      showError(`Connexion Gmail échouée : ${err}${detail ? ` — ${detail}` : ''}`)
      url.searchParams.delete('gmail_error')
      url.searchParams.delete('detail')
      window.history.replaceState({}, '', url.toString())
    }
  }, [refetchStatus])

  if (!gmailStatus) return null

  if (!gmailStatus.connected) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <GmailConnectBanner
          returnTo={returnTo}
          connected={false}
          connectedEmail={null}
          onDisconnected={() => refetchStatus()}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Barre de contrôle */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
        <GmailConnectBanner
          returnTo={returnTo}
          connected={gmailStatus.connected}
          connectedEmail={gmailStatus.email}
          onDisconnected={() => {
            refetchStatus()
            queryClient.removeQueries({ queryKey: ['email-threads', clientId] })
          }}
        />
        <div className="ml-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchThreads()}
            className="h-7 w-7 text-gray-500 hover:bg-white/5 hover:text-gray-300"
            title="Rafraichir"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="h-7 gap-1.5 border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Nouveau mail
          </Button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 overflow-hidden">
        {/* Liste des threads */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-white/10">
          {threadsLoading ? (
            <div className="space-y-px p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5 rounded-lg p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <EmailThreadList
              threads={threads}
              selectedId={selectedThread?.id ?? null}
              onSelect={setSelectedThread}
            />
          )}
        </aside>

        {/* Vue thread ou etat vide */}
        <main className="flex-1 overflow-hidden">
          {selectedThread ? (
            <EmailThreadView
              thread={selectedThread}
              clientEmail={clientEmail}
              clientId={clientId}
              onBack={() => setSelectedThread(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl opacity-10">📧</div>
                <p className="text-sm font-medium text-gray-400">Selectionne un echange</p>
                <p className="text-xs text-gray-600">ou cree un nouveau mail</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Composer nouveau mail */}
      <EmailComposer
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false)
          refetchThreads()
        }}
        clientEmail={clientEmail}
        clientId={clientId}
      />
    </div>
  )
}
