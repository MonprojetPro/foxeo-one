import type { DashboardType } from './auth.types'
import type { CommunicationProfile } from './communication-profile.types'

export type ElioTier = 'lab' | 'one-basic' | 'one-plus'

export type ElioConfig = {
  tier: ElioTier
  communicationProfile?: CommunicationProfile
  customInstructions?: string
}

export type CustomBranding = {
  logoUrl?: string
  primaryColor?: string
  companyName?: string
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
  density: 'compact' | 'comfortable' | 'spacious'
  createdAt: string
  updatedAt: string
}
