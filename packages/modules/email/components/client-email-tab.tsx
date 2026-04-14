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
      <div className="p-4">
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
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <GmailConnectBanner
          returnTo={returnTo}
          connected={gmailStatus.connected}
          connectedEmail={gmailStatus.email}
          onDisconnected={() => {
            refetchStatus()
            queryClient.removeQueries({ queryKey: ['email-threads', clientId] })
          }}
        />
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchThreads()}
            className="h-8 w-8 text-muted-foreground"
            title="Rafraîchir"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
            <PenSquare className="h-3.5 w-3.5" />
            Nouveau mail
          </Button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-1 overflow-hidden">
        {/* Liste des threads */}
        <aside className="w-80 shrink-0 border-r overflow-y-auto">
          {threadsLoading ? (
            <div className="space-y-px p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-md p-3 space-y-1.5">
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
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

        {/* Vue thread ou état vide */}
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
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="text-4xl opacity-20">📧</div>
                <p className="text-sm font-medium">Sélectionne un échange</p>
                <p className="text-xs opacity-60">ou crée un nouveau mail</p>
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
