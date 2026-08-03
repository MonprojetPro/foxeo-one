export { manifest } from './manifest'

// UI
export { MenuFacileDashboard } from './components/menu-facile-dashboard'
export { MetricsTab } from './components/metrics-tab'
export { HouseholdsTab } from './components/households-tab'
export { HouseholdDetailDialog } from './components/household-detail-dialog'
export { UsersTab } from './components/users-tab'
export { ModerationTab } from './components/moderation-tab'
export { RecipesTab } from './components/recipes-tab'
export { MessagesTab } from './components/messages-tab'
export { RecipeFormModal } from './components/recipe-form-modal'
export { MetricCard } from './components/metric-card'
export { HomeBannerTab } from './components/home-banner-tab'

// Data
export { useMenuFacileMetrics } from './hooks/use-menu-facile-metrics'
export { useHouseholds, useHousehold } from './hooks/use-households'
export { useUsers } from './hooks/use-users'
export { getHouseholds, getHousehold, getAllHouseholds } from './actions/households'
export { getUsers } from './actions/users'
export { useHomeBanner, useHomeBannerActions } from './hooks/use-home-banner'
export { useReports, useModerationActions, useRecipeFull } from './hooks/use-moderation'
export { useContactMessages, useContactThread, useContactActions } from './hooks/use-contact-messages'
export { useOfficialRecipes, useOfficialRecipe, useOfficialRecipeActions } from './hooks/use-official-recipes'
export { getMenuFacileMetrics } from './actions/get-metrics'
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
} from './types'
