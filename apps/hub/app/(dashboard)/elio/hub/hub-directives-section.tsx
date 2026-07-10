'use client'

/**
 * Section Directives permanentes — consignes de MiKL injectées dans le system
 * prompt de l'agent Élio Hub (mode « Màj Élio » du widget sidebar).
 * Liste + suppression + ajout manuel. Écriture opérateur only (Server Actions).
 */

import { useState } from 'react'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import {
  addHubDirective,
  removeHubDirective,
  HUB_DIRECTIVE_MAX_LENGTH,
  MAX_HUB_DIRECTIVES,
} from '@monprojetpro/module-elio'
import type { HubDirective } from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

interface HubDirectivesSectionProps {
  initialDirectives: HubDirective[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function HubDirectivesSection({ initialDirectives }: HubDirectivesSectionProps) {
  const [directives, setDirectives] = useState<HubDirective[]>(initialDirectives)
  const [newText, setNewText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    const text = newText.trim()
    if (!text || isAdding) return
    if (text.length > HUB_DIRECTIVE_MAX_LENGTH) {
      showError(`Une directive ne peut pas dépasser ${HUB_DIRECTIVE_MAX_LENGTH} caractères.`)
      return
    }

    setIsAdding(true)
    try {
      const { data, error } = await addHubDirective(text)
      if (error) {
        showError(error.message)
      } else if (data) {
        setDirectives((prev) => [...prev, data])
        setNewText('')
        showSuccess('Directive enregistrée — Élio l’appliquera désormais.')
      }
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(id: string) {
    if (deletingId) return
    setDeletingId(id)
    try {
      const { data, error } = await removeHubDirective(id)
      if (error) {
        showError(error.message)
      } else if (data) {
        setDirectives(data)
        showSuccess('Directive supprimée.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="hub-directives-title">
      {/* Titre de section style cockpit */}
      <div>
        <h3
          id="hub-directives-title"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
        >
          Directives permanentes — Élio Hub
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Consignes durables données à Élio (mode « Màj Élio » du widget, ou ajout manuel ici).
          Injectées dans son cerveau à chaque conversation.{' '}
          <span className="tabular-nums text-gray-500">
            {directives.length}/{MAX_HUB_DIRECTIVES}
          </span>{' '}
          directives.
        </p>
      </div>

      {/* État vide — style cockpit border-dashed blanc/10 */}
      {directives.length === 0 ? (
        <p className="text-sm text-gray-500 italic rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center">
          Aucune directive pour l&apos;instant. Utilise le mode « Màj Élio » du widget sidebar,
          ou ajoute une consigne ci-dessous.
        </p>
      ) : (
        <ul className="space-y-2">
          {directives.map((directive) => (
            <li
              key={directive.id}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.035]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-relaxed break-words">{directive.text}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Ajoutée le {formatDate(directive.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRemove(directive.id)}
                disabled={deletingId !== null}
                title="Supprimer cette directive"
                aria-label={`Supprimer la directive : ${directive.text.slice(0, 60)}`}
                className="shrink-0 rounded-lg p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {deletingId === directive.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Ajout manuel — textarea + bouton cockpit */}
      <div className="flex items-start gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          rows={2}
          maxLength={HUB_DIRECTIVE_MAX_LENGTH}
          placeholder="Ex: À partir de maintenant, toujours tutoyer les clients…"
          aria-label="Nouvelle directive permanente"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isAdding || !newText.trim()}
          className="rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors inline-flex items-center gap-1.5"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ajouter
        </button>
      </div>
    </section>
  )
}
