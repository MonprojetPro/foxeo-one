/**
 * @monprojetpro/utils - Utilitaires partages pour MonprojetPro One
 */

export { cn } from './cn'
export { getRequiredEnv } from './env'
export { formatRelativeDate, formatShortDate, formatDate, formatFullDate } from './date'
export { toCamelCase, toSnakeCase } from './case-transform'
export { getInitials, truncate } from './string'
export { formatCurrency } from './format-currency'
export {
  emailSchema,
  passwordSchema,
  uuidSchema,
  slugSchema,
  phoneSchema,
  clientTypeSchema,
  createClientSchema,
  updateClientSchema,
} from './validation-schemas'
export {
  registerModule,
  discoverModules,
  getModuleRegistry,
  getModule,
  getModulesForTarget,
  clearRegistry,
} from './module-registry'
export {
  parseUserAgent,
  maskIpAddress,
  type ParsedUserAgent,
  type DeviceType,
  type SessionInfo,
} from './parse-user-agent'
export {
  CURRENT_CGU_VERSION,
  CURRENT_IA_POLICY_VERSION,
  CGU_LAST_UPDATED,
  IA_POLICY_LAST_UPDATED,
  CONSENT_TYPES,
  type ConsentType,
} from './constants/legal-versions'
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type Locale,
} from './constants/i18n'
export { t, loadMessages } from './i18n/translate'
export { withOptimisticLock } from './optimistic-lock'
export {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  MIME_TYPE_MAP,
  validateFile,
  formatFileSize,
  type AllowedFileType,
  type FileValidationResult,
} from './file-validation'
export {
  communicationProfileSchema,
  DEFAULT_COMMUNICATION_PROFILE,
  type CommunicationProfileInput,
} from './defaults'
export { readFileContent } from './read-file-content'
