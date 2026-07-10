'use client'

/**
 * Section Config LLM — 3 profils (default / micro / hubAgent), Contrat 2.
 *
 * Chaque profil : provider (anthropic | openai-compatible), model (texte libre
 * + suggestions), baseUrl (visible seulement en openai-compatible, avec presets),
 * apiKeyEnv (validation miroir du schéma Zod : UPPER_SNAKE_CASE + _API_KEY).
 * Enregistrer par profil → setLlmConfig (la config complète est sauvegardée,
 * validée profil par profil côté client avant l'appel).
 */

import { useState } from 'react'
import { setLlmConfig, LlmProfileSchema } from '@monprojetpro/module-elio'
import type { LlmConfig, LlmProfile } from '@monprojetpro/module-elio'
import { showSuccess, showError } from '@monprojetpro/ui'

type ProfileKey = keyof LlmConfig

const PROFILES: Array<{ key: ProfileKey; label: string; description: string }> = [
  {
    key: 'default',
    label: 'Défaut (cœur d’Élio)',
    description: 'Chat Élio Lab/One, brouillons, corrections — le modèle principal.',
  },
  {
    key: 'micro',
    label: 'Micro-tâches',
    description: 'Mots du Concierge, titres de conversation — un modèle éco suffit.',
  },
  {
    key: 'hubAgent',
    label: 'Agent Hub',
    description: 'La boucle agentique Élio Hub (outils + actions) — modèle costaud recommandé.',
  },
]

const MODEL_SUGGESTIONS = [
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'gpt-4.1-mini',
  'gpt-4.1',
  'mistral-large-latest',
  'mistral-small-latest',
  'llama-3.3-70b-versatile',
  'deepseek-chat',
]

const BASE_URL_PRESETS: Array<{ label: string; url: string }> = [
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { label: 'Mistral', url: 'https://api.mistral.ai/v1' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com' },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
]

/** Miroir de l'allowlist Zod (llm-config.types.ts) pour la validation inline. */
const API_KEY_ENV_REGEX = /^[A-Z][A-Z0-9_]*_API_KEY$/

interface LlmConfigSectionProps {
  initialConfig: LlmConfig
}

export function LlmConfigSection({ initialConfig }: LlmConfigSectionProps) {
  const [config, setConfig] = useState<LlmConfig>(initialConfig)
  const [savingProfile, setSavingProfile] = useState<ProfileKey | null>(null)

  function updateProfile(key: ProfileKey, patch: Partial<LlmProfile>) {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleSave(key: ProfileKey) {
    const profile = config[key]
    const parsed = LlmProfileSchema.safeParse(profile)
    if (!parsed.success) {
      showError(parsed.error.issues[0]?.message ?? 'Profil invalide')
      return
    }

    setSavingProfile(key)
    try {
      const { data, error } = await setLlmConfig(config)
      if (error) {
        showError(error.message)
      } else if (data) {
        setConfig(data)
        const label = PROFILES.find((p) => p.key === key)?.label ?? key
        showSuccess(`Profil « ${label} » enregistré`)
      }
    } finally {
      setSavingProfile(null)
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="llm-config-title">
      {/* Titre de section style cockpit — label uppercase xs */}
      <div>
        <h3
          id="llm-config-title"
          className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500"
        >
          Config LLM — fournisseur &amp; modèle
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Trois profils indépendants. Élio bascule instantanément, sans redéploiement.
        </p>
      </div>

      {/* Callout info cockpit — fond cyan très discret */}
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-3.5 text-xs text-cyan-300/90">
        <strong>Important :</strong> la clé API n&apos;est jamais stockée ici. Le champ
        « Nom du secret » désigne un secret Edge Functions Supabase (Dashboard → Edge
        Functions → Secrets) : la clé doit y exister <em>sous ce nom exact</em> (finissant
        par <code className="text-cyan-300">_API_KEY</code>) pour que le profil fonctionne.
      </div>

      <datalist id="llm-model-suggestions">
        {MODEL_SUGGESTIONS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* Grille de profils — cartes cockpit bg-white/[0.02] */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PROFILES.map(({ key, label, description }) => {
          const profile = config[key]
          const isOpenAiCompatible = profile.provider === 'openai-compatible'
          const apiKeyEnvInvalid =
            profile.apiKeyEnv.length > 0 && !API_KEY_ENV_REGEX.test(profile.apiKeyEnv)
          const isSaving = savingProfile === key

          return (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 transition-colors hover:bg-white/[0.04]"
              data-testid={`llm-profile-${key}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>

              <div className="space-y-1">
                <label htmlFor={`provider-${key}`} className="text-xs text-gray-500 block">
                  Fournisseur
                </label>
                <select
                  id={`provider-${key}`}
                  value={profile.provider}
                  onChange={(e) => {
                    const provider = e.target.value as LlmProfile['provider']
                    updateProfile(key, {
                      provider,
                      // anthropic ne prend pas de baseUrl (schéma : null)
                      baseUrl: provider === 'anthropic' ? null : profile.baseUrl,
                    })
                  }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                >
                  <option value="anthropic">Anthropic (natif)</option>
                  <option value="openai-compatible">OpenAI-compatible</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor={`model-${key}`} className="text-xs text-gray-500 block">
                  Modèle
                </label>
                <input
                  id={`model-${key}`}
                  type="text"
                  list="llm-model-suggestions"
                  value={profile.model}
                  onChange={(e) => updateProfile(key, { model: e.target.value })}
                  placeholder="ex: claude-sonnet-4-6"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                />
              </div>

              {isOpenAiCompatible && (
                <div className="space-y-1">
                  <label htmlFor={`baseurl-${key}`} className="text-xs text-gray-500 block">
                    Base URL
                  </label>
                  <input
                    id={`baseurl-${key}`}
                    type="url"
                    value={profile.baseUrl ?? ''}
                    onChange={(e) => updateProfile(key, { baseUrl: e.target.value || null })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/70"
                  />
                  {/* Pills presets — style cockpit */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {BASE_URL_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => updateProfile(key, { baseUrl: preset.url })}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          profile.baseUrl === preset.url
                            ? 'border-cyan-500/60 text-cyan-300 bg-cyan-400/10'
                            : 'border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor={`apikeyenv-${key}`} className="text-xs text-gray-500 block">
                  Nom du secret (Edge Functions Supabase)
                </label>
                <input
                  id={`apikeyenv-${key}`}
                  type="text"
                  value={profile.apiKeyEnv}
                  onChange={(e) => updateProfile(key, { apiKeyEnv: e.target.value.toUpperCase() })}
                  placeholder="ex: MISTRAL_API_KEY"
                  aria-invalid={apiKeyEnvInvalid}
                  className={`w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 ${
                    apiKeyEnvInvalid
                      ? 'border-red-500/50 focus:ring-red-500/70'
                      : 'border-white/10 focus:ring-cyan-500/70'
                  }`}
                />
                {apiKeyEnvInvalid && (
                  <p className="text-[11px] text-red-400">
                    Doit être en MAJUSCULES_AVEC_UNDERSCORES et finir par _API_KEY.
                  </p>
                )}
              </div>

              {/* Bouton cockpit cyan */}
              <button
                type="button"
                onClick={() => void handleSave(key)}
                disabled={isSaving || apiKeyEnvInvalid}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
