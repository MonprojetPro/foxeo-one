'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { createCommunicationProfile, updateCommunicationProfile } from '@monprojetpro/module-elio'
import type {
  CommunicationProfile,
  PreferredTone,
  PreferredLength,
  InteractionStyle,
} from '@monprojetpro/module-elio'

interface CommunicationProfileFormProps {
  clientId: string
  initialProfile: CommunicationProfile | null
}

type OptionItem = { value: string; label: string; description: string }

function OptionButton({
  option,
  selected,
  onSelect,
}: {
  option: OptionItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <div className="font-medium text-foreground">{option.label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{option.description}</div>
    </button>
  )
}

const TONE_OPTIONS: OptionItem[] = [
  { value: 'friendly', label: 'Amical', description: 'Chaleureux et bienveillant' },
  { value: 'casual', label: 'Décontracté', description: 'Accessible et informel' },
  { value: 'formal', label: 'Formel', description: 'Professionnel et soigné' },
  { value: 'technical', label: 'Technique', description: 'Précis et expert' },
]

const LENGTH_OPTIONS: OptionItem[] = [
  { value: 'concise', label: 'Concises', description: '2-3 phrases maximum' },
  { value: 'balanced', label: 'Équilibrées', description: '4-6 phrases' },
  { value: 'detailed', label: 'Détaillées', description: 'Paragraphes complets' },
]

const STYLE_OPTIONS: OptionItem[] = [
  { value: 'directive', label: 'Directif', description: 'Recommandations claires' },
  { value: 'explorative', label: 'Exploratif', description: 'Questions et exploration' },
  { value: 'collaborative', label: 'Collaboratif', description: 'Options + co-décision' },
]

const CONTEXT_OPTIONS: OptionItem[] = [
  { value: 'examples', label: 'Exemples', description: 'Cas concrets pour illustrer' },
  { value: 'theory', label: 'Théorie', description: 'Explications conceptuelles' },
  { value: 'mixed', label: 'Mix', description: 'Exemples et théorie' },
]

export function CommunicationProfileForm({ clientId, initialProfile }: CommunicationProfileFormProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const [tone, setTone] = useState<PreferredTone>(initialProfile?.preferredTone ?? 'friendly')
  const [length, setLength] = useState<PreferredLength>(initialProfile?.preferredLength ?? 'balanced')
  const [style, setStyle] = useState<InteractionStyle>(initialProfile?.interactionStyle ?? 'collaborative')
  const [contextPref, setContextPref] = useState<string>(
    initialProfile?.contextPreferences?.examples ? 'examples'
    : initialProfile?.contextPreferences?.theory ? 'theory'
    : 'mixed'
  )

  const handleSave = () => {
    startTransition(async () => {
      const preferences = {
        clientId,
        preferredTone: tone,
        preferredLength: length,
        interactionStyle: style,
        contextPreferences: {
          examples: contextPref === 'examples',
          theory: contextPref === 'theory',
        },
      }

      // Create profile if it doesn't exist yet, update otherwise
      const result = initialProfile
        ? await updateCommunicationProfile(preferences)
        : await createCommunicationProfile(preferences)

      if (result.error) {
        showError('Impossible de sauvegarder le profil. Veuillez réessayer.')
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['communication-profile', clientId] })
      showSuccess('Profil de communication mis à jour.')
    })
  }

  return (
    <div className="space-y-8 rounded-xl border border-border bg-card p-6">
      {/* Ton */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Ton préféré</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TONE_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={tone === opt.value}
              onSelect={() => setTone(opt.value as PreferredTone)}
            />
          ))}
        </div>
      </div>

      {/* Longueur */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Longueur des réponses</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LENGTH_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={length === opt.value}
              onSelect={() => setLength(opt.value as PreferredLength)}
            />
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Style d&apos;interaction</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STYLE_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={style === opt.value}
              onSelect={() => setStyle(opt.value as InteractionStyle)}
            />
          ))}
        </div>
      </div>

      {/* Contexte */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Type d&apos;explications</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CONTEXT_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              option={opt}
              selected={contextPref === opt.value}
              onSelect={() => setContextPref(opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Enregistrer les préférences'}
        </Button>
      </div>
    </div>
  )
}
