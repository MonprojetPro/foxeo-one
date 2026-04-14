'use client'

import { useState, useTransition } from 'react'
import { Button, Input, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import type { CommunicationProfile } from '@monprojetpro/types'
import { DEFAULT_COMMUNICATION_PROFILE } from '@monprojetpro/utils'
import { updateCommunicationProfile } from '../actions/update-communication-profile'

interface CommunicationProfileFormProps {
  clientId: string
  initialProfile?: CommunicationProfile | null
}

function arrayToString(arr: string[]): string {
  return arr.join(', ')
}

function stringToArray(str: string): string[] {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function CommunicationProfileForm({ clientId, initialProfile }: CommunicationProfileFormProps) {
  const profile = initialProfile ?? DEFAULT_COMMUNICATION_PROFILE

  const [levelTechnical, setLevelTechnical] = useState(profile.levelTechnical)
  const [styleExchange, setStyleExchange] = useState(profile.styleExchange)
  const [adaptedTone, setAdaptedTone] = useState(profile.adaptedTone)
  const [messageLength, setMessageLength] = useState(profile.messageLength)
  const [tutoiement, setTutoiement] = useState(profile.tutoiement)
  const [concreteExamples, setConcreteExamples] = useState(profile.concreteExamples)
  const [avoidStr, setAvoidStr] = useState(arrayToString(profile.avoid))
  const [privilegeStr, setPrivilegeStr] = useState(arrayToString(profile.privilege))
  const [styleNotes, setStyleNotes] = useState(profile.styleNotes)

  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const updatedProfile: CommunicationProfile = {
      levelTechnical,
      styleExchange,
      adaptedTone,
      messageLength,
      tutoiement,
      concreteExamples,
      avoid: stringToArray(avoidStr),
      privilege: stringToArray(privilegeStr),
      styleNotes,
    }

    startTransition(async () => {
      const result = await updateCommunicationProfile(clientId, updatedProfile)

      if (result.error) {
        showError('Impossible d\'enregistrer le profil de communication. Veuillez réessayer.')
        return
      }

      showSuccess('Profil de communication enregistré')
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Niveau technique */}
        <div className="space-y-1">
          <label htmlFor="level-technical" className="text-sm font-medium">
            Niveau technique
          </label>
          <select
            id="level-technical"
            value={levelTechnical}
            onChange={(e) => setLevelTechnical(e.target.value as typeof levelTechnical)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="beginner">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </select>
        </div>

        {/* Style d'échange */}
        <div className="space-y-1">
          <label htmlFor="style-exchange" className="text-sm font-medium">
            Style d&apos;échange
          </label>
          <select
            id="style-exchange"
            value={styleExchange}
            onChange={(e) => setStyleExchange(e.target.value as typeof styleExchange)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="direct">Direct</option>
            <option value="conversationnel">Conversationnel</option>
            <option value="formel">Formel</option>
          </select>
        </div>

        {/* Ton adapté */}
        <div className="space-y-1">
          <label htmlFor="adapted-tone" className="text-sm font-medium">
            Ton adapté
          </label>
          <select
            id="adapted-tone"
            value={adaptedTone}
            onChange={(e) => setAdaptedTone(e.target.value as typeof adaptedTone)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="formel">Formel</option>
            <option value="pro_decontracte">Pro décontracté</option>
            <option value="chaleureux">Chaleureux</option>
            <option value="coach">Coach</option>
          </select>
        </div>

        {/* Longueur des messages */}
        <div className="space-y-1">
          <label htmlFor="message-length" className="text-sm font-medium">
            Longueur des messages
          </label>
          <select
            id="message-length"
            value={messageLength}
            onChange={(e) => setMessageLength(e.target.value as typeof messageLength)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="court">Court</option>
            <option value="moyen">Moyen</option>
            <option value="detaille">Détaillé</option>
          </select>
        </div>
      </div>

      {/* Tutoiement + Exemples concrets */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={tutoiement}
            onChange={(e) => setTutoiement(e.target.checked)}
            className="rounded border-input"
          />
          Tutoiement
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={concreteExamples}
            onChange={(e) => setConcreteExamples(e.target.checked)}
            className="rounded border-input"
          />
          Exemples concrets
        </label>
      </div>

      {/* À éviter */}
      <div className="space-y-1">
        <label htmlFor="avoid" className="text-sm font-medium">
          À éviter (séparés par des virgules)
        </label>
        <Input
          id="avoid"
          value={avoidStr}
          onChange={(e) => setAvoidStr(e.target.value)}
          placeholder="jargon technique, questions ouvertes"
        />
      </div>

      {/* À privilégier */}
      <div className="space-y-1">
        <label htmlFor="privilege" className="text-sm font-medium">
          À privilégier (séparés par des virgules)
        </label>
        <Input
          id="privilege"
          value={privilegeStr}
          onChange={(e) => setPrivilegeStr(e.target.value)}
          placeholder="listes à puces, questions fermées"
        />
      </div>

      {/* Notes libres */}
      <div className="space-y-1">
        <label htmlFor="style-notes" className="text-sm font-medium">
          Notes libres
        </label>
        <Textarea
          id="style-notes"
          value={styleNotes}
          onChange={(e) => setStyleNotes(e.target.value)}
          placeholder="Notes additionnelles sur le style de communication..."
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Enregistrement...' : 'Enregistrer le profil'}
      </Button>
    </div>
  )
}
