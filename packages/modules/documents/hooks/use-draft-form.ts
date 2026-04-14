'use client'

import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'

/**
 * Hook for auto-saving form drafts to localStorage and restoring them.
 *
 * @param formType - Type of form (e.g., 'document-upload', 'create-folder')
 * @param entityId - Unique entity identifier (e.g., clientId)
 * @param form - React Hook Form instance
 * @returns Draft state and actions
 *
 * @example
 * ```tsx
 * const form = useForm<DocumentUploadForm>()
 * const { hasDraft, draftDate, restoreDraft, clearDraft } = useDraftForm(
 *   'document-upload',
 *   clientId,
 *   form
 * )
 *
 * {hasDraft && (
 *   <DraftRestoreBanner
 *     hasDraft={hasDraft}
 *     draftDate={draftDate}
 *     onRestore={restoreDraft}
 *     onDismiss={clearDraft}
 *   />
 * )}
 * ```
 */
export function useDraftForm<T extends FieldValues>(
  formType: string,
  entityId: string,
  form: UseFormReturn<T>
) {
  const draftKey = `draft:${formType}:${entityId}`
  const [hasDraft, setHasDraft] = useState(false)
  const [draftDate, setDraftDate] = useState<Date | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Detection brouillon au montage
  useEffect(() => {
    const raw = localStorage.getItem(draftKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed.timestamp && parsed.values) {
          setHasDraft(true)
          setDraftDate(new Date(parsed.timestamp))
        } else {
          // Invalid format, cleanup
          localStorage.removeItem(draftKey)
        }
      } catch {
        // Corrupted data, cleanup
        localStorage.removeItem(draftKey)
      }
    }
  }, [draftKey])

  // Autosave toutes les 30 secondes via intervalle fixe
  // Utilise un intervalle (pas debounce) pour garantir la sauvegarde même en saisie continue
  useEffect(() => {
    let latestValues: T | undefined

    const subscription = form.watch((values) => {
      latestValues = values as T
    })

    // Intervalle fixe de 30 secondes pour sauvegarder les dernières valeurs
    timerRef.current = setInterval(() => {
      if (latestValues !== undefined) {
        const draftData = {
          values: latestValues,
          timestamp: Date.now(),
        }
        localStorage.setItem(draftKey, JSON.stringify(draftData))
        console.info(`[DOCUMENTS:DRAFT_SAVE] Brouillon sauvegardé: ${draftKey}`)
      }
    }, 30_000)

    // Cleanup subscription and interval on unmount
    return () => {
      subscription.unsubscribe()
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [form, draftKey])

  // Effacement apres soumission reussie
  useEffect(() => {
    if (form.formState.isSubmitSuccessful) {
      localStorage.removeItem(draftKey)
      setHasDraft(false)
      console.info(`[DOCUMENTS:DRAFT_CLEAR] Brouillon effacé après soumission: ${draftKey}`)
    }
  }, [form.formState.isSubmitSuccessful, draftKey])

  /**
   * Restore draft values into the form
   */
  const restoreDraft = () => {
    const raw = localStorage.getItem(draftKey)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      if (parsed.values) {
        form.reset(parsed.values)
        setHasDraft(false)
        console.info(`[DOCUMENTS:DRAFT_RESTORE] Brouillon restauré: ${draftKey}`)
      }
    } catch {
      // Corrupted data, just clear it
      localStorage.removeItem(draftKey)
      setHasDraft(false)
    }
  }

  /**
   * Clear draft from localStorage
   */
  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    setHasDraft(false)
    console.info(`[DOCUMENTS:DRAFT_CLEAR] Brouillon effacé manuellement: ${draftKey}`)
  }

  return {
    hasDraft,
    draftDate,
    restoreDraft,
    clearDraft,
  }
}
