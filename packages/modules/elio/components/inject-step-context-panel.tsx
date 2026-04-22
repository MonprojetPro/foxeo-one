'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  Textarea,
  Badge,
} from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { FileText, Type, Trash2, Upload, CheckCircle2, Clock } from 'lucide-react'
import { injectStepContext } from '../actions/inject-step-context'
import { getStepContexts } from '../actions/get-step-contexts'
import { deleteStepContext } from '../actions/delete-step-context'
import type { StepContext } from '../actions/get-step-contexts'

interface InjectStepContextPanelProps {
  parcoursAgentId: string
  clientId: string
  stepLabel: string
  open: boolean
  onClose: () => void
}

type Tab = 'text' | 'file'

const ACCEPTED_FILES = '.txt,.pdf,.docx'

export function InjectStepContextPanel({
  parcoursAgentId,
  clientId,
  stepLabel,
  open,
  onClose,
}: InjectStepContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('text')
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const contextsKey = ['step-contexts', parcoursAgentId]

  const { data: contexts, isLoading: isLoadingContexts } = useQuery({
    queryKey: contextsKey,
    queryFn: async () => {
      const result = await getStepContexts(parcoursAgentId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    enabled: open,
    staleTime: 30 * 1000,
  })

  const injectMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      if (activeTab === 'text') {
        fd.set('text', text)
      } else if (selectedFile) {
        fd.set('file', selectedFile)
      }
      return injectStepContext(parcoursAgentId, clientId, fd)
    },
    onSuccess: (result) => {
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess('Contexte injecté — Élio l\'annoncera au client à sa prochaine ouverture du chat.')
      setText('')
      setSelectedFile(null)
      queryClient.invalidateQueries({ queryKey: contextsKey })
      queryClient.invalidateQueries({ queryKey: ['step-context-counts', clientId] })
    },
    onError: () => showError('Une erreur inattendue est survenue'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (contextId: string) => {
      setPendingDeleteId(contextId)
      return deleteStepContext(contextId)
    },
    onSuccess: (result, contextId) => {
      setPendingDeleteId(null)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess('Contexte supprimé.')
      queryClient.setQueryData(contextsKey, (prev: StepContext[] | undefined) =>
        (prev ?? []).filter((c) => c.id !== contextId)
      )
      queryClient.invalidateQueries({ queryKey: ['step-context-counts', clientId] })
    },
    onError: () => {
      setPendingDeleteId(null)
      showError('Impossible de supprimer ce contexte')
    },
  })

  const canSubmit =
    activeTab === 'text' ? text.trim().length > 0 : selectedFile !== null

  const pendingCount = (contexts ?? []).filter((c) => !c.consumedAt).length

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:w-[520px] flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold text-foreground">
            Nourrir Élio
          </SheetTitle>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{stepLabel}</p>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="w-fit text-xs mt-1" aria-label={`${pendingCount} contexte(s) en attente`}>
              {pendingCount} contexte{pendingCount > 1 ? 's' : ''} en attente
            </Badge>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Tabs text / file */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              aria-pressed={activeTab === 'text'}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Type className="w-3.5 h-3.5" aria-hidden="true" />
              Ajouter un prompt
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              aria-pressed={activeTab === 'file'}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === 'file'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Uploader un fichier
            </button>
          </div>

          {/* Text input */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label htmlFor="context-text" className="text-sm font-medium text-foreground">
                Prompt ou précisions pour Élio
              </label>
              <Textarea
                id="context-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex : Quelle est ta proposition de valeur unique ? Concentre-toi sur..."
                rows={5}
                maxLength={5000}
                aria-label="Texte du contexte à injecter"
              />
              <p className="text-xs text-muted-foreground text-right">
                {text.length} / 5 000
              </p>
            </div>
          )}

          {/* File input */}
          {activeTab === 'file' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fichier à joindre
              </label>
              <div
                role="button"
                tabIndex={0}
                aria-label="Zone d'upload de fichier"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <FileText className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                {selectedFile ? (
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Cliquer pour choisir un fichier</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, TXT — max 10 Mo</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILES}
                className="sr-only"
                aria-label="Choisir un fichier"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setSelectedFile(f)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={() => injectMutation.mutate()}
            disabled={!canSubmit || injectMutation.isPending}
            className="w-full"
            aria-label="Injecter le contexte dans Élio"
          >
            {injectMutation.isPending ? 'Injection…' : 'Injecter dans Élio'}
          </Button>

          {/* Historique */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historique des injections
            </h3>

            {isLoadingContexts && (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!isLoadingContexts && (!contexts || contexts.length === 0) && (
              <p className="text-sm text-muted-foreground">Aucun contexte injecté pour cette étape.</p>
            )}

            {!isLoadingContexts && contexts && contexts.length > 0 && (
              <ol className="space-y-2" aria-label="Historique des contextes injectés">
                {contexts.map((ctx) => (
                  <li
                    key={ctx.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    {/* Icône type */}
                    <div className="shrink-0 mt-0.5">
                      {ctx.contentType === 'file' ? (
                        <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Type className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      {ctx.fileName && (
                        <p className="text-xs font-medium text-foreground truncate">{ctx.fileName}</p>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {ctx.contextMessage.slice(0, 80)}{ctx.contextMessage.length > 80 ? '…' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {ctx.consumedAt ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            Présenté au client
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-500">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            En attente
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ctx.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={() => {
                        const label = ctx.consumedAt ? 'Ce contexte a déjà été présenté au client. Confirmer la suppression ?' : 'Supprimer ce contexte ?'
                        if (!window.confirm(label)) return
                        deleteMutation.mutate(ctx.id)
                      }}
                      disabled={pendingDeleteId === ctx.id}
                      aria-label={`Supprimer le contexte du ${new Date(ctx.createdAt).toLocaleDateString('fr-FR')}`}
                      className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
