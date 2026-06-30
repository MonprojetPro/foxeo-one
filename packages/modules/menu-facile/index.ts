export { manifest } from './manifest'

// UI
export { MenuFacileDashboard } from './components/menu-facile-dashboard'
export { MetricsTab } from './components/metrics-tab'
export { MetricCard } from './components/metric-card'

// Data
export { useMenuFacileMetrics } from './hooks/use-menu-facile-metrics'
export { getMenuFacileMetrics } from './actions/get-metrics'

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
  OfficialRecipeListItem,
  RecipeIngredientInput,
  RecipeStepInput,
  OfficialRecipeInput,
} from './types'
