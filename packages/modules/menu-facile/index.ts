export { manifest } from './manifest'

// UI
export { MenuFacileDashboard } from './components/menu-facile-dashboard'
export { MetricsTab } from './components/metrics-tab'
export { HouseholdsTab } from './components/households-tab'
export { HouseholdDetailDialog } from './components/household-detail-dialog'
export { UsersTab } from './components/users-tab'
export { InsightsSection } from './components/insights-section'
export { ModerationTab } from './components/moderation-tab'
export { RecipesTab } from './components/recipes-tab'
export { MessagesTab } from './components/messages-tab'
export { ContactAttachments } from './components/contact-attachments'
export { RecipeFormModal } from './components/recipe-form-modal'
export { MetricCard } from './components/metric-card'
export { HomeBannerTab } from './components/home-banner-tab'
export { NotificationsTab } from './components/notifications-tab'

// Data
export { useMenuFacileMetrics } from './hooks/use-menu-facile-metrics'
export { useHouseholds, useHousehold } from './hooks/use-households'
export { useUsers } from './hooks/use-users'
export { getHouseholds, getHousehold, getAllHouseholds } from './actions/households'
export { getUsers } from './actions/users'
export { useHouseholdsDistribution, useRetentionCohorts } from './hooks/use-insights'
export { getHouseholdsDistribution, getRetentionCohorts } from './actions/get-insights'
export { useHomeBanner, useHomeBannerActions } from './hooks/use-home-banner'
export {
  useNotifications,
  useNotificationAudienceCount,
  useNotificationActions,
} from './hooks/use-notifications'
export { useReports, useModerationActions, useRecipeFull } from './hooks/use-moderation'
export { useContactMessages, useContactThread, useContactActions } from './hooks/use-contact-messages'
export { useOfficialRecipes, useOfficialRecipe, useOfficialRecipeActions } from './hooks/use-official-recipes'
export { getMenuFacileMetrics } from './actions/get-metrics'
export { getMenuFacileHomeWidgets } from './actions/get-home-widgets'
export type { MenuFacileHomeWidgets } from './actions/get-home-widgets'
// Agent Élio Hub (get_menufacile_report) — l'action existait déjà, on l'expose au barrel.
export { getMenuFacileTimeseries } from './actions/get-timeseries'
export { getMenuFacileReports } from './actions/get-reports'
export { getRecipeFull } from './actions/get-recipe'
export {
  getContactMessages,
  getContactThread,
  resolveContactMessage,
  replyToContactMessage,
  deleteContactMessage,
  refreshContactAttachmentUrl,
} from './actions/contact-messages'
export { adjustContactReply } from './actions/adjust-reply'
export { hideRecipe, banUser, resolveReport } from './actions/moderation'
export {
  getOfficialRecipes,
  getOfficialRecipe,
  createOfficialRecipe,
  updateOfficialRecipe,
  deleteOfficialRecipe,
} from './actions/official-recipes'
export { getHomeBanner, updateHomeBanner } from './actions/home-banner'
export {
  getNotifications,
  getNotificationAudienceCount,
  sendNotification,
  deleteNotification,
} from './actions/notifications'
export { uploadBannerImage } from './actions/upload-banner-image'

// Types (le helper serveur `callMenuFacileAdmin` n'est PAS ré-exporté : server-only).
export type {
  Season,
  Course,
  RecipeType,
  MealType,
  Difficulty,
  Budget,
  ReportStatus,
  ContactStatus,
  ContactTopic,
  ContactMessage,
  ContactThread,
  ContactThreadMessage,
  ContactAttachment,
  TopRecipe,
  MenuFacileMetrics,
  MenuFacileTimeseries,
  MenuFacileTimeseriesPoint,
  MenuFacileReport,
  ReportedRecipePreview,
  OfficialRecipeListItem,
  OfficialRecipeDetail,
  RecipeIngredientInput,
  RecipeStepInput,
  OfficialRecipeInput,
  HomeBanner,
  HomeBannerInput,
  MenuFacileNotification,
  MenuFacileNotificationInput,
  NotificationAudienceCount,
  BannerTextColor,
  HouseholdListItem,
  HouseholdStatus,
  HouseholdSort,
  HouseholdsQuery,
  HouseholdDetail,
  HouseholdMember,
  HouseholdPlanning,
  ActivityFilter,
  SortOrder,
  Paginated,
  UserListItem,
  UserSort,
  UserStatusFilter,
  UsersQuery,
  HouseholdsDistribution,
  HouseholdSizeBucket,
  RetentionCohorts,
  RetentionCohort,
  CohortPoint,
} from './types'
