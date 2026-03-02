'use client'

import { useState, useRef, useEffect } from 'react'
import { formatRelativeDate } from '@foxeo/utils'
import type { ElioConversation, DashboardType } from '../types/elio.types'

interface ConversationItemProps {
  conversation: ElioConversation
  isActive: boolean
  dashboardType: DashboardType
  onSelect: () => void
  onRenameTitle?: (id: string, newTitle: string) => void
}

const ACTIVE_CLASSES: Record<DashboardType, string> = {
  hub: 'bg-[oklch(0.7_0.15_190/0.15)] border-l-2 border-[oklch(0.7_0.15_190)]',
  lab: 'bg-[oklch(0.6_0.2_280/0.15)] border-l-2 border-[oklch(0.6_0.2_280)]',
  one: 'bg-[oklch(0.7_0.2_50/0.15)] border-l-2 border-[oklch(0.7_0.2_50)]',
}

const MAX_PREVIEW_CHARS = 30

function truncatePreview(text: string): string {
  if (text.length <= MAX_PREVIEW_CHARS) return text
  return text.slice(0, MAX_PREVIEW_CHARS) + '…'
}

export function ConversationItem({
  conversation,
  isActive,
  dashboardType,
  onSelect,
  onRenameTitle,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  function handleDoubleClick(e: React.MouseEvent) {
    if (!onRenameTitle) return
    e.stopPropagation()
    setEditValue(conversation.title)
    setIsEditing(true)
  }

  function commitEdit() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== conversation.title && onRenameTitle) {
      onRenameTitle(conversation.id, trimmed)
    }
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') {
      setEditValue(conversation.title)
      setIsEditing(false)
    }
  }

  const activeClass = isActive ? ACTIVE_CLASSES[dashboardType] : ''

  return (
    <div
      role="listitem"
      onClick={!isEditing ? onSelect : undefined}
      className={[
        'group flex flex-col gap-0.5 px-3 py-2 cursor-pointer',
        'hover:bg-muted/50 transition-colors duration-150',
        isActive ? activeClass : 'border-l-2 border-transparent',
      ].join(' ')}
      aria-current={isActive ? 'true' : undefined}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-sm font-medium bg-background border border-border rounded px-1 py-0.5 focus:outline-none"
          aria-label="Modifier le titre de la conversation"
          maxLength={100}
        />
      ) : (
        <div className="flex items-center gap-1">
          <span
            className="flex-1 text-sm font-medium truncate"
            onDoubleClick={handleDoubleClick}
            title={onRenameTitle ? 'Double-clic pour renommer' : conversation.title}
          >
            {conversation.title}
          </span>
          {onRenameTitle && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditValue(conversation.title)
                setIsEditing(true)
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity text-xs p-0.5"
              aria-label="Renommer la conversation"
              tabIndex={-1}
            >
              ✎
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time dateTime={conversation.updatedAt} title={conversation.updatedAt}>
          {formatRelativeDate(conversation.updatedAt)}
        </time>
        <span className="truncate flex-1">{truncatePreview(conversation.lastMessagePreview ?? '')}</span>
      </div>
    </div>
  )
}
