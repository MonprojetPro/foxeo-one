import type { CommunicationProfile } from '../types/communication-profile.types'

/**
 * Convertit le profil de communication en labels lisibles pour les prompts LLM.
 * Centralisé pour éviter la duplication dans correct-and-adapt-text, generate-draft, adjust-draft.
 */
export function getProfileLabels(profile: CommunicationProfile | null): {
  toneLabel: string
  lengthLabel: string
  styleLabel: string
} {
  const toneLabel =
    profile?.preferredTone === 'formal'
      ? 'Formel (vouvoiement, langage soutenu)'
      : profile?.preferredTone === 'casual'
        ? 'Décontracté (tutoiement possible, naturel)'
        : profile?.preferredTone === 'technical'
          ? 'Technique (précis, direct)'
          : 'Chaleureux (bienveillant, empathique)'

  const lengthLabel =
    profile?.preferredLength === 'concise'
      ? 'Court et direct'
      : profile?.preferredLength === 'detailed'
        ? 'Détaillé et complet'
        : 'Équilibré (ni trop court ni trop long)'

  const styleLabel =
    profile?.interactionStyle === 'directive'
      ? 'Directif (instructions claires)'
      : profile?.interactionStyle === 'explorative'
        ? 'Exploratoire (questions ouvertes)'
        : 'Collaboratif (échanges partenariaux)'

  return { toneLabel, lengthLabel, styleLabel }
}
