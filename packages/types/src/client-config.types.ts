import type { DashboardType } from './auth.types'
import type { CommunicationProfile } from './communication-profile.types'

export type ElioTier = 'lab' | 'one-basic' | 'one-plus'

export type ElioModuleDoc = {
  moduleId: string
  description: string
  faq: Array<{ question: string; answer: string }>
  commonIssues: Array<{ problem: string; diagnostic: string; escalation: string }>
  updatedAt: string
}

export type ElioConfig = {
  tier: ElioTier
  communicationProfile?: CommunicationProfile
  customInstructions?: string
}

export type CustomBranding = {
  logoUrl: string | null
  displayName: string | null
  accentColor: string | null
  updatedAt: string
}

export type ClientConfig = {
  id: string
  clientId: string
  dashboardType: DashboardType
  activeModules: string[]
  themeVariant: 'lab' | 'one'
  customBranding?: CustomBranding
  elioConfig?: ElioConfig
  elioTier?: 'one' | 'one_plus'
  elioModuleDocs?: ElioModuleDoc[]
  density: 'compact' | 'comfortable' | 'spacious'
  showLabTeasing?: boolean
  // ADR-01 Révision 2 — Toggle Mode Lab/One et feature flag Élio Lab
  labModeAvailable: boolean
  elioLabEnabled: boolean
  createdAt: string
  updatedAt: string
}
