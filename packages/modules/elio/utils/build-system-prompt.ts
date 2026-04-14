import type { CommunicationProfile } from '../types/communication-profile.types'

export interface StepContext {
  stepNumber: number
  title: string
  description: string
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: 'Adoptez un ton professionnel et formel.',
  casual: 'Utilisez un ton décontracté et accessible.',
  technical: 'Privilégiez un vocabulaire technique et précis.',
  friendly: 'Soyez chaleureux et amical dans vos réponses.',
}

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  concise: 'Répondez de façon concise (2-3 phrases maximum).',
  detailed: 'Fournissez des réponses détaillées et exhaustives.',
  balanced: 'Équilibrez concision et détails (4-6 phrases).',
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  directive: 'Donnez des instructions claires et des recommandations directes.',
  explorative: 'Posez des questions pour explorer davantage les besoins.',
  collaborative: 'Proposez des options et impliquez le client dans la co-décision.',
}

export function buildElioSystemPrompt(
  profile: CommunicationProfile,
  step?: StepContext,
  customInstructions?: string | null
): string {
  const toneInstruction = TONE_INSTRUCTIONS[profile.preferredTone] ?? TONE_INSTRUCTIONS.friendly
  const lengthInstruction = LENGTH_INSTRUCTIONS[profile.preferredLength] ?? LENGTH_INSTRUCTIONS.balanced
  const styleInstruction = STYLE_INSTRUCTIONS[profile.interactionStyle] ?? STYLE_INSTRUCTIONS.collaborative

  const contextInstruction = profile.contextPreferences?.examples
    ? 'Utilisez des exemples concrets pour illustrer vos propos.'
    : profile.contextPreferences?.theory
    ? 'Fournissez des explications théoriques.'
    : 'Mélangez exemples et théorie.'

  let stepContext = ''
  if (step) {
    stepContext = `\n\nLe client est actuellement à l'étape ${step.stepNumber} : "${step.title}". ${step.description}\n\nVotre rôle est de l'aider à progresser sur cette étape en particulier.`
  }

  const basePrompt = `Vous êtes Élio, l'assistant IA personnel du client dans son parcours MonprojetPro Lab.

**Profil de communication du client :**
- Ton : ${toneInstruction}
- Longueur : ${lengthInstruction}
- Style : ${styleInstruction}
- Contexte : ${contextInstruction}
${stepContext}

Adaptez vos réponses selon ces préférences tout en restant utile et bienveillant.`

  if (customInstructions?.trim()) {
    return `${basePrompt}\n\n**Instructions supplémentaires :**\n${customInstructions.trim()}`
  }

  return basePrompt
}
