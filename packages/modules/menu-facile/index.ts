export { manifest } from './manifest'

// UI
export { MenuFacileDashboard } from './components/menu-facile-dashboard'
export { MetricsTab } from './components/metrics-tab'
export { ModerationTab } from './components/moderation-tab'
export { RecipesTab } from './components/recipes-tab'
export { RecipeFormModal } from './components/recipe-form-modal'
export { MetricCard } from './components/metric-card'

// Data
export { useMenuFacileMetrics } from './hooks/use-menu-facile-metrics'
export { useReports, useModerationActions } from './hooks/use-moderation'
export { useOfficialRecipes, useOfficialRecipeActions } from './hooks/use-official-recipes'
export { getMenuFacileMetrics } from './actions/get-metrics'
export { getMenuFacileReports } from './actions/get-reports'
export { hideRecipe, banUser, resolveReport } from './actions/moderation'
export {
  getOfficialRecipes,
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
  TopRecipe,
  MenuFacileMetrics,
  MenuFacileReport,
  ReportedRecipePreview,
  OfficialRecipeListItem,
  RecipeIngredientInput,
  RecipeStepInput,
  OfficialRecipeInput,
} from './types'
