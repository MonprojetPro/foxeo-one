// ---------------------------------------------------------------------------
// Types du contrat du guichet « admin-api » de MenuFacile.
// Source unique de vérité côté Hub — alignés sur la réponse JSON de l'API.
// ---------------------------------------------------------------------------

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type Course = 'entree' | 'plat' | 'dessert' | 'apero'
export type RecipeType = 'complete' | 'simple'
export type MealType = 'lunch' | 'dinner' | 'both'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Budget = 'low' | 'medium' | 'high'
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'acted'

// --- GET /metrics ----------------------------------------------------------

export interface TopRecipe {
  id: string
  name: string
  copy_count: number
  rating_count: number
}

export interface MenuFacileMetrics {
  generated_at: string
  users: { total: number; new_7d: number; banned: number }
  households: { total: number; official: number; members: number }
  recipes: {
    total: number
    public: number
    official: number
    hidden: number
    new_7d: number
    total_copies: number
  }
  moderation: { reports_pending: number; reports_total: number }
  ratings: { total: number }
  friendships: { total: number }
  top_recipes: TopRecipe[]
}

// --- GET /reports ----------------------------------------------------------

export interface MenuFacileReport {
  id: string
  recipe_id: string
  reported_by: string
  reason: string
  details: string | null
  status: ReportStatus
  resolved_at: string | null
  created_at: string
}

// --- GET /official-recipes -------------------------------------------------

export interface OfficialRecipeListItem {
  id: string
  name: string
  course: Course
  recipe_type: RecipeType
  meal_type: MealType
  visibility: string
  is_hidden: boolean
  copy_count: number
  rating_count: number
  created_at: string
}

export interface RecipeIngredientInput {
  name: string
  quantity?: number
  unit?: string
  aisle?: string
  position?: number
}

export interface RecipeStepInput {
  text: string
  photo_url?: string
  position?: number
}

/** Corps POST /official-recipes (name + seasons requis) et PATCH (tout optionnel). */
export interface OfficialRecipeInput {
  name: string
  seasons: Season[]
  course?: Course
  recipe_type?: RecipeType
  meal_type?: MealType
  prep_minutes?: number
  cook_minutes?: number
  rest_minutes?: number
  portions?: number
  is_vegetarian?: boolean
  is_gluten_free?: boolean
  is_lactose_free?: boolean
  difficulty?: Difficulty
  budget?: Budget
  photo_url?: string
  notes?: string
  variants_tips?: string
  source_url?: string
  ingredients?: RecipeIngredientInput[]
  steps?: RecipeStepInput[]
}
