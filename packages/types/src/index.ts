/**
 * @monprojetpro/types - Types partages pour MonprojetPro One
 */

export type { ActionError, ActionResponse } from './action-response'
export { successResponse, errorResponse } from './action-response'

export type {
  ModuleTarget,
  ModuleRoute,
  ModuleNavigation,
  ModuleDocumentation,
  ModuleManifest,
} from './module-manifest'

export type { UserRole, DashboardType, DeviceType, UserSession, SessionInfo } from './auth.types'

export type {
  ElioTier,
  ElioConfig,
  ElioModuleDoc,
  CustomBranding,
  ClientConfig,
} from './client-config.types'

export type { Json, Database } from './database.types'

export type {
  TechnicalLevel,
  ExchangeStyle,
  AdaptedTone,
  MessageLength,
  CommunicationProfile,
} from './communication-profile.types'
