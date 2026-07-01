export { manifest } from './manifest'

// UI
export { MenuFacileDashboard } from './components/menu-facile-dashboard'
export { MetricsTab } from './components/metrics-tab'
export { ModerationTab } from './components/moderation-tab'
export { RecipesTab } from './components/recipes-tab'
export { MessagesTab } from './components/messages-tab'
export { RecipeFormModal } from './components/recipe-form-modal'
export { MetricCard } from './components/metric-card'

// Data
export { useMenuFacileMetrics } from './hooks/use-menu-facile-metrics'
export { useReports, useModerationActions, useRecipeFull } from './hooks/use-moderation'
export { useContactMessages, useContactThread, useContactActions } from './hooks/use-contact-messages'
export { useOfficialRecipes, useOfficialRecipe, useOfficialRecipeActions } from './hooks/use-official-recipes'
export { getMenuFacileMetrics } from './actions/get-metrics'
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
  MenuFacileReport,
  ReportedRecipePreview,
  OfficialRecipeListItem,
  OfficialRecipeDetail,
  RecipeIngredientInput,
  RecipeStepInput,
  OfficialRecipeInput,
} from './types'
