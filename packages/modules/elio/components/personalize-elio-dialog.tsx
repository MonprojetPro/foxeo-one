'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { createCommunicationProfile } from '../actions/create-communication-profile'
import type {
  PreferredTone,
  PreferredLength,
  InteractionStyle,
  ContextPreferences,
} from '../types/communication-profile.types'

interface PersonalizeElioDialogProps {
  clientId: string
  isOpen: boolean
  onClose: () => void
}

type OptionItem = { value: string; label: string }

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
      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
      }`}
    >
      {option.label}
    </button>
  )
}

const TONE_OPTIONS: OptionItem[] = [
  { value: 'friendly', label: 'Amical et chaleureux' },
  { value: 'casual', label: 'Décontracté' },
  { value: 'formal', label: 'Formel et professionnel' },
  { value: 'technical', label: 'Technique et précis' },
]

const LENGTH_OPTIONS: OptionItem[] = [
  { value: 'concise', label: 'Concises (2-3 phrases)' },
  { value: 'balanced', label: 'Équilibrées (4-6 phrases)' },
  { value: 'detailed', label: 'Détaillées (paragraphes complets)' },
]

const STYLE_OPTIONS: OptionItem[] = [
  { value: 'directive', label: 'Directif (recommandations claires)' },
  { value: 'explorative', label: 'Exploratif (questions pour creuser)' },
  { value: 'collaborative', label: 'Collaboratif (options + co-décision)' },
]

const CONTEXT_OPTIONS: OptionItem[] = [
  { value: 'examples', label: 'Exemples concrets' },
  { value: 'theory', label: 'Explications théoriques' },
  { value: 'mixed', label: 'Mix des deux' },
]

export function PersonalizeElioDialog({ clientId, isOpen, onClose }: PersonalizeElioDialogProps) {
  const [tone, setTone] = useState<PreferredTone>('friendly')
  const [length, setLength] = useState<PreferredLength>('balanced')
  const [style, setStyle] = useState<InteractionStyle>('collaborative')
  const [context, setContext] = useState<string>('mixed')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const contextPreferences: ContextPreferences = {
        examples: context === 'examples',
        theory: context === 'theory',
      }

      const result = await createCommunicationProfile({
        clientId,
        preferredTone: tone,
        preferredLength: length,
        interactionStyle: style,
        contextPreferences,
      })

      if (result.error) {
        showError("Impossible de créer le profil. Veuillez réessayer.")
        return
      }

      showSuccess("Élio va maintenant adapter ses réponses à vos préférences.")
      onClose()
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personnalisons Élio</DialogTitle>
          <DialogDescription>
            Configurez les préférences de communication pour personnaliser les réponses d&apos;Élio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question 1 : Ton */}
          <div>
            <p className="mb-3 text-sm font-semibold">Quel ton préférez-vous ?</p>
            <div className="flex flex-wrap gap-2">
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

          {/* Question 2 : Longueur */}
          <div>
            <p className="mb-3 text-sm font-semibold">Longueur des réponses ?</p>
            <div className="flex flex-wrap gap-2">
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

          {/* Question 3 : Style interaction */}
          <div>
            <p className="mb-3 text-sm font-semibold">Comment souhaitez-vous interagir ?</p>
            <div className="flex flex-wrap gap-2">
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

          {/* Question 4 : Contexte */}
          <div>
            <p className="mb-3 text-sm font-semibold">{"Type d'explications ?"}</p>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  option={opt}
                  selected={context === opt.value}
                  onSelect={() => setContext(opt.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Passer
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
