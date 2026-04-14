import type { DashboardType, CommunicationProfileFR66, ElioTier } from '../types/elio.types'
import { DEFAULT_COMMUNICATION_PROFILE_FR66 } from '../types/elio.types'
import { HUB_FEATURES_DOCUMENTATION } from './hub-features-documentation'
import { HUB_DATABASE_SCHEMAS } from './hub-database-schemas'
import { ONE_NAVIGATION_MAP } from './one-navigation-map'

/** Message upsell Élio One → One+ (AC1 — Story 8.9a) */
export const UPSELL_ONE_PLUS_MESSAGE =
  "Cette fonctionnalité fait partie de l'offre Élio One+. Contactez MiKL pour en savoir plus !"

interface SystemPromptOptions {
  dashboardType: DashboardType
  communicationProfile?: CommunicationProfileFR66
  tier?: ElioTier
  activeStepContext?: string
  activeModulesDocs?: string | null
  customInstructions?: string | null
  // Story 8.7: contexte héritage Lab
  labBriefs?: string | null
  parcoursContext?: string | null
}

const TECHNICAL_LEVEL_INSTRUCTIONS: Record<string, string> = {
  beginner: 'Expliquez les concepts simplement, évitez le jargon technique, utilisez des analogies.',
  intermediaire: 'Utilisez un langage accessible avec quelques termes techniques expliqués.',
  advanced: 'Vous pouvez utiliser un vocabulaire technique précis sans surexplication.',
}

const EXCHANGE_STYLE_INSTRUCTIONS: Record<string, string> = {
  direct: 'Soyez direct et concis. Allez droit au but sans détours.',
  conversationnel: 'Adoptez un style conversationnel, naturel et engageant.',
  formel: 'Utilisez un registre formel et professionnel en toutes circonstances.',
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  formel: 'Ton professionnel et soutenu.',
  pro_decontracte: 'Ton professionnel mais décontracté, chaleureux sans être familier.',
  chaleureux: 'Ton chaleureux, bienveillant et encourageant.',
  coach: 'Ton de coach : motivant, orienté solutions, challenges constructifs.',
}

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  court: 'Réponses courtes et directes (2-3 phrases maximum).',
  moyen: 'Réponses de longueur équilibrée (4-6 phrases).',
  detaille: 'Réponses détaillées et complètes, n\'hésitez pas à développer.',
}

function buildProfileInstructions(profile: CommunicationProfileFR66): string {
  const lines: string[] = [
    `- Niveau technique : ${TECHNICAL_LEVEL_INSTRUCTIONS[profile.levelTechnical]}`,
    `- Style d'échange : ${EXCHANGE_STYLE_INSTRUCTIONS[profile.styleExchange]}`,
    `- Ton : ${TONE_INSTRUCTIONS[profile.adaptedTone]}`,
    `- Longueur : ${LENGTH_INSTRUCTIONS[profile.messageLength]}`,
    `- Tutoiement : ${profile.tutoiement ? 'Oui — tutoyez le client.' : 'Non — vouvoyez le client.'}`,
    `- Exemples concrets : ${profile.concreteExamples ? 'Oui — illustrez vos propos avec des exemples.' : 'Non — restez dans le conceptuel.'}`,
  ]

  if (profile.avoid.length > 0) {
    lines.push(`- À éviter : ${profile.avoid.join(', ')}.`)
  }
  if (profile.privilege.length > 0) {
    lines.push(`- À privilégier : ${profile.privilege.join(', ')}.`)
  }
  if (profile.styleNotes.trim()) {
    lines.push(`- Notes : ${profile.styleNotes.trim()}`)
  }

  return lines.join('\n')
}

const BASE_PROMPT = `Vous êtes Élio, l'assistant IA de la plateforme MonprojetPro.
Votre mission est d'accompagner les entrepreneurs avec bienveillance, expertise et efficacité.
Répondez toujours en français sauf si le client écrit dans une autre langue.`

const LAB_OBSERVATION_INSTRUCTIONS = `
## Observation des préférences de communication

Pendant la conversation, observe le client et détecte ses préférences implicites :
- Préfère-t-il des messages courts ou détaillés ?
- Est-il plus réceptif à un ton formel ou décontracté ?
- Répond-il mieux aux questions ouvertes ou fermées ?
- A-t-il des frustrations récurrentes (questions répétitives, jargon technique) ?
- Y a-t-il des moments de la journée où il est plus réactif ?

**Si tu détectes une préférence claire**, note-la dans le champ metadata du message avec la clé "profile_observation".
Exemple : "Client préfère les listes à puces", "Client frustré par les questions ouvertes", "Client répond mieux le matin".

Ces observations aideront à affiner son profil de communication.`

function buildLabPrompt(profile: CommunicationProfileFR66, stepContext?: string): string {
  let prompt = `${BASE_PROMPT}

**Contexte : Dashboard Lab (Incubation)**
Vous accompagnez un entrepreneur dans son parcours d'incubation MonprojetPro Lab.
Votre rôle est de guider, questionner et aider à structurer les briefs d'étapes.

**Profil de communication du client :**
${buildProfileInstructions(profile)}${LAB_OBSERVATION_INSTRUCTIONS}`

  if (stepContext) {
    prompt += `\n\n**Étape active :**\n${stepContext}`
  }

  prompt += `\n\nCapacités disponibles : guidage parcours, questions adaptées au profil, génération de briefs.`

  return prompt
}

function buildOnePrompt(
  profile: CommunicationProfileFR66,
  tier: ElioTier,
  modulesDocs?: string | null,
  labBriefs?: string | null,
  parcoursContext?: string | null,
): string {
  let prompt = `${BASE_PROMPT}

**Contexte : Dashboard One (Outil Business)**
Vous assistez un entrepreneur dans l'utilisation de son outil MonprojetPro One.
Répondez aux questions fréquentes, guidez dans les fonctionnalités disponibles.

**Profil de communication du client :**
${buildProfileInstructions(profile)}`

  if (modulesDocs) {
    prompt += `\n\n**Documentation des modules actifs :**\n${modulesDocs}`
  }

  prompt += `\n\n**Navigation dashboard One :**\n${ONE_NAVIGATION_MAP}`

  prompt += `\n\n**Règle modules non activés :** Si le client pose une question sur un module qui n'est pas dans sa navigation, répondez : "Cette fonctionnalité n'est pas encore activée pour vous. Vous pouvez demander à MiKL de l'activer."`

  if (labBriefs) {
    prompt += `\n\n**Briefs Lab validés du client :**\n${labBriefs}\n\n**Important :** Vous pouvez référencer ces briefs dans vos réponses pour montrer que vous connaissez le contexte du client. Ne reposez jamais les mêmes questions que pendant le Lab.`
  }

  if (parcoursContext) {
    prompt += `\n\n**Décisions MiKL pendant le Lab :**\n${parcoursContext}`
  }

  if (tier === 'one_plus') {
    prompt += `\n\n**Tes capacités (Élio One+) :**
- Répondre aux questions (FAQ)
- Guider dans le dashboard
- Collecter des demandes d'évolutions
- **Exécuter des actions** sur les modules actifs (envoyer rappels, créer événements, etc.)
- **Générer des documents** (génération de documents)
- **Envoyer des alertes proactives**

**Important pour les actions :**
- Toujours demander confirmation avant d'exécuter
- Afficher les détails (liste des entités concernées)
- Double confirmation pour les actions destructives (suppression)`
  } else {
    prompt += `\n\n**Tes capacités (Élio One) :**
- Répondre aux questions (FAQ)
- Guider dans le dashboard
- Collecter des demandes d'évolutions

**Ce que tu NE PEUX PAS faire :**
- Exécuter des actions sur les modules
- Générer des documents
- Envoyer des alertes proactives

Si on te demande une action non disponible, réponds : "${UPSELL_ONE_PLUS_MESSAGE}"`
  }

  return prompt
}

function buildHubPrompt(): string {
  return `${BASE_PROMPT}

**Contexte : Dashboard Hub (Opérateur MiKL)**
Vous assistez l'opérateur dans la gestion de la plateforme MonprojetPro.
Vous avez accès au contexte de tous les clients et pouvez aider sur les fonctionnalités Hub.

Capacités disponibles : recherche clients, analyse des données, rédaction/correction de contenus, aide fonctionnalités Hub.

${HUB_FEATURES_DOCUMENTATION}

${HUB_DATABASE_SCHEMAS}

Si MiKL pose une question hors du périmètre Hub : "Ça sort un peu de mon périmètre, mais je peux essayer de t'aider quand même !"`
}

/**
 * Construit le system prompt Élio selon le dashboardType et la configuration fournie.
 * Utilisé dans send-to-elio.ts avant l'appel au LLM.
 */
export function buildSystemPrompt(options: SystemPromptOptions): string {
  const {
    dashboardType,
    communicationProfile = DEFAULT_COMMUNICATION_PROFILE_FR66,
    tier = 'one',
    activeStepContext,
    activeModulesDocs,
    customInstructions,
    labBriefs,
    parcoursContext,
  } = options

  let prompt: string

  switch (dashboardType) {
    case 'lab':
      prompt = buildLabPrompt(communicationProfile, activeStepContext)
      break
    case 'one':
      prompt = buildOnePrompt(communicationProfile, tier, activeModulesDocs, labBriefs, parcoursContext)
      break
    case 'hub':
      prompt = buildHubPrompt()
      break
    default:
      prompt = BASE_PROMPT
  }

  if (customInstructions?.trim()) {
    prompt += `\n\n**Instructions personnalisées :**\n${customInstructions.trim()}`
  }

  return prompt
}
