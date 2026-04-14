'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Video, Code, Clock, ChevronDown } from 'lucide-react'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { reactivateLab } from '../actions/reactivate-lab'
import { scheduleVisio } from '../actions/schedule-visio'
import { startDev } from '../actions/start-dev'
import { PostponeDialog } from './postpone-dialog'

type ActionPickerProps = {
  requestId: string
  clientId: string
  parcoursId: string | null
  requestTitle: string
  clientName: string
  disabled?: boolean
}

export function ActionPicker({
  requestId,
  clientId,
  parcoursId,
  requestTitle,
  clientName,
  disabled = false,
}: ActionPickerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isPostponeOpen, setIsPostponeOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  async function invalidateQueries(includesParcours = false) {
    const promises = [
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] }),
    ]
    if (includesParcours) {
      promises.push(queryClient.invalidateQueries({ queryKey: ['parcours', clientId] }))
    }
    await Promise.all(promises)
  }

  function handleReactivateLab() {
    if (!parcoursId) return
    setIsOpen(false)
    startTransition(async () => {
      const result = await reactivateLab(requestId, clientId, parcoursId)
      if (result.error) {
        showError('Erreur lors de la réactivation — veuillez réessayer')
        return
      }
      showSuccess('Parcours Lab réactivé')
      await invalidateQueries(true)
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  function handleScheduleVisio() {
    setIsOpen(false)
    startTransition(async () => {
      const result = await scheduleVisio(requestId, clientId)
      if (result.error) {
        showError('Erreur lors de la mise à jour — veuillez réessayer')
        return
      }
      await invalidateQueries()
      if (result.data?.calComUrl) {
        window.open(result.data.calComUrl, '_blank', 'width=800,height=600')
      }
    })
  }

  function handleStartDev() {
    setIsOpen(false)
    startTransition(async () => {
      const result = await startDev(requestId, clientId, requestTitle)
      if (result.error) {
        showError('Erreur lors de la prise en charge — veuillez réessayer')
        return
      }
      await invalidateQueries()
      if (result.data?.cursorUrl) {
        showSuccess('Demande prise en charge — bon dev !')
        window.open(result.data.cursorUrl, '_blank')
      } else {
        showSuccess('Demande prise en charge — le chemin BMAD n\'est pas configuré pour ce client')
      }
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  function handlePostpone() {
    setIsOpen(false)
    setIsPostponeOpen(true)
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isPending || disabled}
        className="border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {isPending ? 'Traitement...' : 'Actions de traitement'}
        <ChevronDown className="h-4 w-4 ml-2" />
      </Button>

      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full mb-2 right-0 w-72 rounded-md border border-border bg-card shadow-lg z-50"
        >
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            Choisir une action
          </div>

          {/* Option A — Réactiver Lab (conditionnelle si parcoursId existe) */}
          {parcoursId && (
            <button
              role="menuitem"
              onClick={handleReactivateLab}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
            >
              <RefreshCw className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">
                  Réactiver le parcours Lab
                </div>
                <div className="text-xs text-muted-foreground">
                  Le besoin est trop complexe — le client doit passer par un parcours complet
                </div>
              </div>
            </button>
          )}

          {/* Option B — Programmer Visio */}
          <button
            role="menuitem"
            onClick={handleScheduleVisio}
            className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
          >
            <Video className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">
                Programmer une visio
              </div>
              <div className="text-xs text-muted-foreground">
                Besoin de clarifier en direct avec le client
              </div>
            </div>
          </button>

          {/* Option C — Dev direct */}
          <button
            role="menuitem"
            onClick={handleStartDev}
            className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
          >
            <Code className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">
                Développer directement
              </div>
              <div className="text-xs text-muted-foreground">
                Le besoin est clair — je le développe
              </div>
            </div>
          </button>

          {/* Option D — Reporter */}
          <button
            role="menuitem"
            onClick={handlePostpone}
            className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
          >
            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Reporter</div>
              <div className="text-xs text-muted-foreground">
                Pas maintenant — à traiter plus tard
              </div>
            </div>
          </button>
        </div>
      )}

      <PostponeDialog
        open={isPostponeOpen}
        onClose={() => setIsPostponeOpen(false)}
        requestId={requestId}
        requestTitle={requestTitle}
        clientName={clientName}
      />
    </div>
  )
}
