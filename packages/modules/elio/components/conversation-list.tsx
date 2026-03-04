'use client'

import { useState, useRef, useEffect } from 'react'
import { ConversationItem } from './conversation-item'
import type { ElioConversation, DashboardType } from '../types/elio.types'

interface ConversationListProps {
  conversations: ElioConversation[]
  activeConversationId: string | null
  dashboardType: DashboardType
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onRenameTitle?: (id: string, newTitle: string) => void
  isCreating?: boolean
  // Story 8.7 — Task 6.3 : conversations Lab accessibles depuis One
  labConversations?: ElioConversation[]
}

const ACCENT_CLASSES: Record<DashboardType, string> = {
  hub: 'text-[oklch(0.7_0.15_190)] hover:bg-[oklch(0.7_0.15_190/0.1)]',
  lab: 'text-[oklch(0.6_0.2_280)] hover:bg-[oklch(0.6_0.2_280/0.1)]',
  one: 'text-[oklch(0.7_0.2_50)] hover:bg-[oklch(0.7_0.2_50/0.1)]',
}

export function ConversationList({
  conversations,
  activeConversationId,
  dashboardType,
  onSelectConversation,
  onNewConversation,
  onRenameTitle,
  isCreating = false,
  labConversations,
}: ConversationListProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const accentClass = ACCENT_CLASSES[dashboardType]

  // Fermer le drawer sur clic extérieur (mobile)
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsDrawerOpen(false)
      }
    }
    if (isDrawerOpen) {
      document.addEventListener('mousedown', handleMouseDown)
    }
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isDrawerOpen])

  function handleSelect(id: string) {
    onSelectConversation(id)
    setIsDrawerOpen(false)
  }

  const listContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <button
          onClick={onNewConversation}
          disabled={isCreating}
          className={[
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
            'border border-border',
            'hover:bg-muted transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-50',
            accentClass,
          ].join(' ')}
          aria-label="Démarrer une nouvelle conversation"
        >
          <span aria-hidden="true">+</span>
          {isCreating ? 'Création…' : 'Nouvelle conversation'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2" role="list" aria-label="Liste des conversations">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            Aucune conversation pour l'instant
          </p>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              dashboardType={dashboardType}
              onSelect={() => handleSelect(conv.id)}
              onRenameTitle={onRenameTitle}
            />
          ))
        )}

        {/* Story 8.7 — Task 6.3 : Section "Historique Lab" pour clients diplômés */}
        {labConversations && labConversations.length > 0 && (
          <>
            <div
              className="px-3 pt-4 pb-1"
              aria-label="Historique Lab"
              role="separator"
            >
              <hr className="border-border mb-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Historique Lab
              </p>
            </div>
            {labConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                dashboardType="lab"
                onSelect={() => handleSelect(conv.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Bouton toggle mobile (< 768px) */}
      <div className="md:hidden">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ouvrir la liste des conversations"
          aria-expanded={isDrawerOpen}
        >
          <span aria-hidden="true">☰</span>
          Conversations
        </button>

        {/* Drawer mobile plein écran */}
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-background"
            role="dialog"
            aria-modal="true"
            aria-label="Liste des conversations"
          >
            <div ref={drawerRef} className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-sm font-semibold">Conversations</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Fermer la liste des conversations"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{listContent}</div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar desktop collapsible (>= 768px) */}
      <aside
        className="hidden md:flex flex-col w-64 border-r border-border bg-background shrink-0"
        aria-label="Conversations Élio"
      >
        <div className="p-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Conversations
          </h2>
        </div>
        <div className="flex-1 overflow-hidden">{listContent}</div>
      </aside>
    </>
  )
}
