// Notifications Module
export { manifest } from './manifest'

// Components
export { NotificationBadge } from './components/notification-badge'
export { NotificationCenter } from './components/notification-center'
export { NotificationItem } from './components/notification-item'
export { notifyToast } from './components/notification-toast'

// Hooks
export { useNotifications } from './hooks/use-notifications'
export { useUnreadCount } from './hooks/use-unread-count'
export { useNotificationsRealtime } from './hooks/use-notifications-realtime'

// Actions
export { getNotifications } from './actions/get-notifications'
export { getUnreadCount } from './actions/get-unread-count'
export { markAsRead } from './actions/mark-as-read'
export { markAllAsRead } from './actions/mark-all-as-read'
export { deleteAllNotifications } from './actions/delete-all-notifications'
export { createNotification } from './actions/create-notification'
export { getNotificationPrefs } from './actions/get-notification-prefs'
export { updateNotificationPrefs } from './actions/update-notification-prefs'
export { setOperatorOverride } from './actions/set-operator-override'
export { checkNotificationAllowed } from './actions/check-notification-allowed'

// Components (prefs)
export { NotificationPrefsPage } from './components/notification-prefs-page'
export { OperatorOverrideSection } from './components/operator-override-section'
export { PrefToggleRow } from './components/pref-toggle-row'

// Hooks (prefs)
export { useNotificationPrefs } from './hooks/use-notification-prefs'

// Types
export type {
  Notification,
  NotificationDB,
  NotificationType,
  RecipientType,
  GetNotificationsInput,
  CreateNotificationInput,
  MarkAsReadInput,
} from './types/notification.types'

export { NOTIFICATION_ICONS } from './types/notification.types'

export type {
  NotificationPreference,
  NotificationPreferenceDB,
  UpdatePreferenceInput,
  SetOperatorOverrideInput,
  CheckNotificationAllowedInput,
  NotificationAllowedResult,
  NotificationPreferenceType,
} from './types/notification-prefs.types'

export {
  PREFERENCE_NOTIFICATION_TYPES,
  CRITICAL_INAPP_TYPES,
  mapPreferenceFromDB,
} from './types/notification-prefs.types'

export { PREF_LABELS } from './types/notification-prefs-labels'
