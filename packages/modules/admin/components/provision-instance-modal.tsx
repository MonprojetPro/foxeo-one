'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { showSuccess, showError } from '@monprojetpro/ui'
import { provisionOneInstanceFromHub } from '../actions/provision-instance'
import { SLUG_REGEX, toSlug } from '../utils/slug-validation'
import type { ProvisionStep } from '../actions/provision-instance'

const ALL_MODULES = [
  { id: 'core-dashboard', label: 'Dashboard' },
  { id: 'elio', label: 'Élio IA' },
  { id: 'documents', label: 'Documents' },
  { id: 'chat', label: 'Chat' },
  { id: 'visio', label: 'Visioconférence' },
  { id: 'crm', label: 'CRM' },
  { id: 'facturation', label: 'Facturation' },
]

const TIER_OPTIONS = [
  { value: 'base', label: 'Base (~5€/mois)' },
  { value: 'essentiel', label: 'Essentiel — Élio One (~7€/mois)' },
  { value: 'agentique', label: 'Agentique — Élio One+ (~7€/mois)' },
] as const

const STEP_LABELS: Record<ProvisionStep, string> = {
  validation: 'Validation...',
  supabase: 'Création Supabase...',
  migrations: 'Exécution des migrations...',
  vercel: 'Déploiement Vercel...',
  health_check: 'Vérification de santé...',
  ready: 'Prêt !',
  failed: 'Échec',
}

type ProvisionStatus = 'idle' | 'running' | 'success' | 'error'

interface ProvisionInstanceModalProps {
  clientId: string
  companyName: string
  onClose: () => void
  onSuccess?: (instanceUrl: string) => void
}

export function ProvisionInstanceModal({
  clientId,
  companyName,
  onClose,
  onSuccess,
}: ProvisionInstanceModalProps) {
  const [slug, setSlug] = useState(() => toSlug(companyName))
  const [slugError, setSlugError] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>(['core-dashboard', 'elio'])
  const [tier, setTier] = useState<'base' | 'essentiel' | 'agentique'>('essentiel')
  const [status, setStatus] = useState<ProvisionStatus>('idle')
  const [currentStep, setCurrentStep] = useState<ProvisionStep | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const instanceUrl = `https://${slug || '...'}.monprojet-pro.com`
  const isRunning = status === 'running'

  // Realtime subscription for progress
  useEffect(() => {
    if (status !== 'running') return
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`provisioning:${clientId}`)
      .on('broadcast', { event: 'progress' }, (payload) => {
        const { step, message } = payload.payload as { step: ProvisionStep; message: string }
        setCurrentStep(step)
        if (step === 'failed') {
          setErrorMessage(message)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, status])

  function validateSlug(value: string): string | null {
    if (!value) return 'Le slug est requis'
    if (!SLUG_REGEX.test(value)) return 'Slug invalide : 3–50 caractères en kebab-case (lettres minuscules, chiffres, tirets)'
    return null
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    setSlugError(validateSlug(value))
  }

  function toggleModule(moduleId: string) {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    )
  }

  async function handleSubmit() {
    if (isSubmitting) return
    const slugErr = validateSlug(slug)
    if (slugErr) {
      setSlugError(slugErr)
      return
    }
    if (selectedModules.length === 0) {
      showError('Sélectionnez au moins un module')
      return
    }

    setIsSubmitting(true)
    setStatus('running')
    setCurrentStep('validation')
    setErrorMessage(null)

    const result = await provisionOneInstanceFromHub({ clientId, slug, modules: selectedModules, tier })

    if (result.error || !result.data) {
      setStatus('error')
      setIsSubmitting(false)
      setErrorMessage(result.error?.message ?? 'Une erreur est survenue')
      showError(result.error?.message ?? 'Erreur lors du provisioning')
      return
    }

    setStatus('success')
    setCurrentStep('ready')
    showSuccess(`Instance ${slug}.monprojet-pro.com provisionnée avec succès !`)
    onSuccess?.(result.data.instanceUrl)
  }

  function handleRetry() {
    setStatus('idle')
    setIsSubmitting(false)
    setCurrentStep(null)
    setErrorMessage(null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="provision-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="provision-modal-title" className="text-base font-semibold text-white">
              Provisionner une instance One
            </h2>
            <p className="text-sm text-gray-400">{companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            aria-label="Fermer"
            className="rounded p-1 text-gray-400 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Progress indicator */}
        {(status === 'running' || status === 'success') && currentStep && (
          <div
            aria-live="polite"
            aria-label="Progression du provisioning"
            className="mb-4 rounded border border-white/10 bg-white/5 p-4"
          >
            <p className="text-sm font-medium text-cyan-400">
              {status === 'success' ? '✅ Prêt !' : `⏳ ${STEP_LABELS[currentStep]}`}
            </p>
            {currentStep && (
              <p className="mt-1 text-xs text-gray-400">{STEP_LABELS[currentStep]}</p>
            )}
          </div>
        )}

        {/* Error display */}
        {status === 'error' && errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-500/30 bg-red-950/50 p-3 text-sm text-red-400"
          >
            <p className="font-medium">Échec du provisioning</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        {status !== 'running' && status !== 'success' && (
          <>
            {/* Slug */}
            <div className="mb-4">
              <label htmlFor="provision-slug" className="mb-1 block text-sm text-gray-300">
                Sous-domaine (slug)
              </label>
              <input
                id="provision-slug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                placeholder="mon-entreprise"
                aria-describedby={slugError ? 'slug-error' : 'slug-hint'}
              />
              {slugError ? (
                <p id="slug-error" role="alert" className="mt-1 text-xs text-red-400">
                  {slugError}
                </p>
              ) : (
                <p id="slug-hint" className="mt-1 text-xs text-gray-500">
                  URL résultante :{' '}
                  <span className="text-cyan-400">{instanceUrl}</span>
                </p>
              )}
            </div>

            {/* Modules */}
            <fieldset className="mb-4">
              <legend className="mb-2 text-sm text-gray-300">Modules à activer</legend>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map((mod) => (
                  <label
                    key={mod.id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(mod.id)}
                      onChange={() => toggleModule(mod.id)}
                      className="accent-cyan-400"
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Tier */}
            <div className="mb-4">
              <label htmlFor="provision-tier" className="mb-1 block text-sm text-gray-300">
                Tier Élio initial
              </label>
              <select
                id="provision-tier"
                value={tier}
                onChange={(e) => setTier(e.target.value as typeof tier)}
                className="w-full rounded border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {TIER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost estimate */}
            <p className="mb-5 text-xs text-gray-500">
              Estimation coût mensuel Vercel + Supabase Free : <span className="text-gray-300">~5–7€</span>
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {status === 'error' && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Réessayer
            </button>
          )}
          {status !== 'success' && status !== 'running' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!!slugError || selectedModules.length === 0}
                className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-40"
              >
                Lancer le provisioning
              </button>
            </>
          )}
          {status === 'success' && (
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
