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
export type ContactStatus = 'new' | 'read' | 'resolved'
export type ContactTopic = 'bug' | 'improvement' | 'other'

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
  /** Boîte Aide & Contact (v6) — optionnel pour rester rétro-compatible. */
  contact?: { new: number; total: number }
}

// --- GET /contact-messages -------------------------------------------------

export interface ContactMessage {
  id: string
  user_id: string
  household_id: string
  topic: ContactTopic
  message: string
  user_agent: string | null
  created_at: string
  status: ContactStatus
  resolved_at: string | null
  user_email: string | null
  household_name: string | null
}

// --- GET /reports ----------------------------------------------------------

/**
 * Aperçu de la recette signalée, embarqué dans GET /reports (Option B).
 * Tous les champs sont optionnels : le Hub fonctionne même si MenuFacile ne
 * l'envoie pas encore (rétro-compatible).
 */
export interface ReportedRecipePreview {
  id: string
  name?: string
  photo_url?: string | null
  is_public?: boolean
  is_hidden?: boolean
  author_id?: string | null
  author_name?: string | null
}

export interface MenuFacileReport {
  id: string
  recipe_id: string
  reported_by: string
  /** Nom lisible du signaleur (foyer/utilisateur) — optionnel, fallback sur l'UUID. */
  reporter_name?: string | null
  reason: string
  details: string | null
  status: ReportStatus
  resolved_at: string | null
  created_at: string
  /** Aperçu enrichi (Option B) — présent dès que MenuFacile l'expose. */
  recipe?: ReportedRecipePreview | null
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

/**
 * Détail complet d'une recette officielle, renvoyé par GET /official-recipes/:id.
 * Permet de pré-remplir intégralement le formulaire d'édition. Champs tolérants
 * (null/undefined) pour rester robuste aux variations de la réponse.
 */
export interface OfficialRecipeDetail {
  id: string
  name: string
  seasons?: Season[]
  course?: Course
  recipe_type?: RecipeType
  meal_type?: MealType
  prep_minutes?: number | null
  cook_minutes?: number | null
  rest_minutes?: number | null
  portions?: number | null
  is_vegetarian?: boolean
  is_gluten_free?: boolean
  is_lactose_free?: boolean
  difficulty?: Difficulty | null
  budget?: Budget | null
  photo_url?: string | null
  notes?: string | null
  variants_tips?: string | null
  source_url?: string | null
  is_hidden?: boolean
  visibility?: string
  copy_count?: number
  rating_count?: number
  created_at?: string
  ingredients?: RecipeIngredientInput[]
  steps?: RecipeStepInput[]
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
