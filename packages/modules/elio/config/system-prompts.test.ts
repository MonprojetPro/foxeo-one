import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './system-prompts'
import type { CommunicationProfileFR66 } from '../types/elio.types'

const profileDefaut: CommunicationProfileFR66 = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: [],
  privilege: [],
  styleNotes: '',
}

describe('buildSystemPrompt', () => {
  describe('Dashboard Lab', () => {
    it('contient le contexte Lab dans le prompt', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).toContain('Dashboard Lab')
      expect(prompt).toContain('parcours d\'incubation')
    })

    it('inclut les instructions de profil de communication', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).toContain('Profil de communication')
      expect(prompt).toContain('Niveau technique')
    })

    it('inclut le contexte d\'étape si fourni', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'lab',
        communicationProfile: profileDefaut,
        activeStepContext: 'Étape 3 : Modèle économique',
      })
      expect(prompt).toContain('Étape 3 : Modèle économique')
    })

    it('ne contient pas de section étape si non fournie', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).not.toContain('Étape active')
    })

    it('inclut tutoiement si activé', () => {
      const profile: CommunicationProfileFR66 = { ...profileDefaut, tutoiement: true }
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profile })
      expect(prompt).toContain('tutoyez le client')
    })

    it('inclut vouvoyement si tutoiement désactivé', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).toContain('vouvoyez le client')
    })
  })

  describe('Dashboard One', () => {
    it('contient le contexte One dans le prompt', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).toContain('Dashboard One')
      expect(prompt).toContain('outil Foxeo One')
    })

    it('mentionne les capacités One+ pour tier=one_plus', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one_plus' })
      expect(prompt).toContain('One+')
      expect(prompt).toContain('génération de documents')
    })

    it('mentionne les capacités de base pour tier=one', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one' })
      expect(prompt).toContain('FAQ')
      expect(prompt).not.toContain('génération de documents')
    })

    it('inclut la documentation des modules si fournie', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'one',
        communicationProfile: profileDefaut,
        activeModulesDocs: 'Module CRM: gestion des contacts...',
      })
      expect(prompt).toContain('Module CRM: gestion des contacts...')
    })
  })

  describe('Dashboard Hub', () => {
    it('contient le contexte Hub dans le prompt', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).toContain('Dashboard Hub')
      expect(prompt).toContain('opérateur')
    })

    it('mentionne les capacités Hub', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).toContain('recherche clients')
    })

    it('Task 4.2 — inclut la documentation des fonctionnalités Hub (AC2, FR22)', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).toContain('Fonctionnalités Hub disponibles')
      expect(prompt).toContain('Validation Hub')
      expect(prompt).toContain('/modules/crm')
    })

    it('Task 4.3 — inclut la phrase hors périmètre (AC2)', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).toContain('périmètre')
    })

    it('Task 8.3 — inclut les schémas de base de données (AC4)', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).toContain('Schémas de base de données disponibles')
      expect(prompt).toContain('Table clients')
      expect(prompt).toContain('validation_requests')
    })
  })

  describe('Instructions personnalisées', () => {
    it('ajoute les instructions personnalisées si fournies', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'lab',
        communicationProfile: profileDefaut,
        customInstructions: 'Toujours répondre en bullet points.',
      })
      expect(prompt).toContain('Instructions personnalisées')
      expect(prompt).toContain('Toujours répondre en bullet points.')
    })

    it('ignore les instructions vides', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'lab',
        communicationProfile: profileDefaut,
        customInstructions: '   ',
      })
      expect(prompt).not.toContain('Instructions personnalisées')
    })
  })

  describe('Profil par défaut', () => {
    it('fonctionne sans profil de communication (utilise les valeurs par défaut)', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab' })
      expect(prompt).toContain('Dashboard Lab')
      expect(prompt).toContain('Profil de communication')
    })
  })

  describe('Éléments du profil', () => {
    it('inclut les items avoid si définis', () => {
      const profile: CommunicationProfileFR66 = { ...profileDefaut, avoid: ['jargon technique'] }
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profile })
      expect(prompt).toContain('jargon technique')
    })

    it('inclut les items privilege si définis', () => {
      const profile: CommunicationProfileFR66 = { ...profileDefaut, privilege: ['listes à puces'] }
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profile })
      expect(prompt).toContain('listes à puces')
    })
  })

  describe('Story 8.7 — Élio One enrichi', () => {
    it('Task 5 — inclut la cartographie navigation One dans le prompt', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).toContain('Navigation dashboard One')
      expect(prompt).toContain('/modules/documents')
      expect(prompt).toContain('/modules/facturation')
    })

    it('Task 4.4 — inclut le message pour module non activé', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).toContain('Cette fonctionnalité n\'est pas encore activée')
      expect(prompt).toContain('MiKL de l\'activer')
    })

    it('Task 7 — inclut les briefs Lab si fournis', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'one',
        communicationProfile: profileDefaut,
        labBriefs: '- **Brief branding** : Identité visuelle orange et moderne...',
      })
      expect(prompt).toContain('Briefs Lab validés du client')
      expect(prompt).toContain('Brief branding')
    })

    it('Task 7 — n\'inclut pas de section briefs Lab si non fournis', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).not.toContain('Briefs Lab validés')
    })

    it('Task 8 — inclut le parcours_context si fourni', () => {
      const prompt = buildSystemPrompt({
        dashboardType: 'one',
        communicationProfile: profileDefaut,
        parcoursContext: 'MiKL a validé le brief branding le 01/03/2026.',
      })
      expect(prompt).toContain('Décisions MiKL pendant le Lab')
      expect(prompt).toContain('MiKL a validé le brief branding')
    })

    it('Task 8 — n\'inclut pas de section parcours si non fourni', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).not.toContain('Décisions MiKL pendant le Lab')
    })

    it('Task 4 — n\'inclut pas la nav One dans le prompt Lab', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).not.toContain('Navigation dashboard One')
    })
  })

  describe('Story 8.9a — Système de tiers Élio One vs One+ (AC1)', () => {
    it('Task 2.2 — prompt One contient la liste des capacités One (FAQ, guidance, évolutions)', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one' })
      expect(prompt).toContain('Élio One')
      expect(prompt).toContain('FAQ')
      expect(prompt).toContain("demandes d'évolutions")
    })

    it('Task 2.2 — prompt One tier=one contient "CE QUE TU NE PEUX PAS FAIRE"', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one' })
      expect(prompt).toContain('NE PEUX PAS')
    })

    it('Task 2.2 — prompt One+ contient les actions modules', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one_plus' })
      expect(prompt).toContain('One+')
      expect(prompt).toContain('actions')
      expect(prompt).toContain('confirmation')
    })

    it('Task 2.4 — prompt One contient message upsell One+', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut, tier: 'one' })
      expect(prompt).toContain('One+')
      expect(prompt).toContain('MiKL')
    })
  })

  describe('Instructions d\'observation Lab (Story 8.4 — AC3)', () => {
    it('inclut les instructions d\'observation dans le prompt Lab', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).toContain('Observation des préférences de communication')
    })

    it('inclut la clé profile_observation dans les instructions Lab', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'lab', communicationProfile: profileDefaut })
      expect(prompt).toContain('profile_observation')
    })

    it('n\'inclut pas les instructions d\'observation dans le prompt One', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'one', communicationProfile: profileDefaut })
      expect(prompt).not.toContain('profile_observation')
    })

    it('n\'inclut pas les instructions d\'observation dans le prompt Hub', () => {
      const prompt = buildSystemPrompt({ dashboardType: 'hub' })
      expect(prompt).not.toContain('profile_observation')
    })
  })
})
